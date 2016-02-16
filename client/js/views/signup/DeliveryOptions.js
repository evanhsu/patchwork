var List = require('../util/List'),
    DeliveryOptions = function() { return List.apply( this, arguments ) }

Object.assign( DeliveryOptions.prototype, List.prototype, {

    calculateOptionCost( model ) {
        var duration = this.model.get('duration'),
            weeklyCost = model.get('price'),
            weeklyCostFloat = ( model.get('price').charAt(0) === "-" ) ? parseFloat( "-" + weeklyCost.slice(2) ).toFixed(2) : parseFloat( weeklyCost.slice(1) ).toFixed(2),
            optionTotalCost = ( weeklyCostFloat * duration ).toFixed(2)
        
        if( model.get('name') === "farm" ) this.templateData.optionTotal.text( 'Option Total: Save $' + duration.toFixed(2) )
        else this.templateData.optionTotal.text( 'Option Total: $' + optionTotalCost )

        this.selectedDelivery = { weeklyCost: weeklyCostFloat, totalCost: optionTotalCost }
        
        this.model.set( 'selectedDelivery',
            ( this.model.has('selectedDelivery') ) ? this.model.get('selectedDelivery').concat( this.selectedDelivery ) : [ this.selectedDelivery ] )

    },

    ItemView: require('./DeliveryOption'),

    Models: {
        DeliveryRoute: require('../../models/DeliveryRoute'),
        Dropoff: require('../../models/Dropoff')
    },

    Views: {
        Dropoffs: require('./Dropoffs')
    },

    farmFeedback() {
        this.farmPickup = new ( this.Models.DeliveryRoute.extend( { parse: response => this.Models.DeliveryRoute.prototype.parse( response[0] ) } ) )()
        this.farmPickup.fetch( { data: { label: 'farm' } } ).done( () => {
            if( Object.keys( this.farmPickup.attributes ).length === 0 ) {
                this.valid = false
                return this.showFeedback( this.feedback.noFarmRoute() )
            }
            this.showFeedback( this.feedback.home( this.farmPickup.attributes ) ) 
            this.model.set( 'selectedDelivery',
                ( this.model.has('selectedDelivery') ) ? this.model.get('selectedDelivery').concat( this.farmPickup.attributes ) : [ this.farmPickup.attributes ] )
            this.valid = true
        } )
    },
    
    feedback: {
        home: require('../../templates/signup/homeDeliveryFeedback')( require('handlebars') ),
        invalidZip: function( zipcode ) {
            return this.util.format( 'Postal Code of %s is not in our delivery area.  Please contact us to discuss options', zipcode )
        },
        noFarmRoute: function() { return "There is currently an error with On-Farm Pickup selection" }
    },

    getItemViewOptions() { return { container: this.templateData.options } },

    getTemplateOptions() { return this.model.attributes },

    groupFeedback() {
        this.dropoffIds.fetch( { data: { shareid: this.model.id } } ).done( () => {
            if( ! this.dropoffIds.length ) { this.valid = false; return }
            this.dropoffs.fetch( { data: { id: this.dropoffIds.map( model => model.get('groupdropoffid') ).join(',') } } ).done( () => {
                this.dropoffs.forEach( model => model.set( { dayofweek: this.dropoffIds.find( dropoff => dropoff.get('groupdropoffid') == model.id ).get('dayofweek') } ) )
                this.dropoffView = new this.Views.Dropoffs( { itemModels: this.dropoffs.models, container: this.templateData.feedback } )
                .on( 'itemUnselected', () => {
                    this.model.get('selectedDelivery').pop()
                    this.valid = false 
                } )
                .on( 'itemSelected', model => {
                    this.model.set( 'selectedDelivery',
                        ( this.model.has('selectedDelivery') ) ? this.model.get('selectedDelivery').concat( model.attributes ) : [ model.attributes ] )
                    this.valid = true
                } )
            } )
        } )
    },

    homeFeedback() {
        this.zipRoute = new ( this.Model.extend( { parse: response => response[0], urlRoot: "/zipcoderoute" } ) )()
        this.homeDeliveryRoute = new this.Models.DeliveryRoute()

        this.zipRoute
            .fetch( { data: { zipcode: this.signupData.addressModel.postalCode } } )
            .done( () => {
                if( Object.keys( this.zipRoute.attributes ).length === 0 ) {
                    this.valid = false
                    return this.showFeedback( this.feedback.invalidZip.call( this, this.signupData.addressModel.postalCode ) )
                }    
                this.homeDeliveryRoute.set( { id: this.zipRoute.get('routeid') } )
                .fetch()
                .done( () => {
                    this.showFeedback( this.feedback.home( this.homeDeliveryRoute.attributes ) )

                    this.model.set( 'selectedDelivery',
                        ( this.model.has('selectedDelivery') ) ? this.model.get('selectedDelivery').concat( this.homeDeliveryRoute.attributes ) : [ this.homeDeliveryRoute.attributes ] )

                    this.valid = true
                } )
            } )
    },

    postRender() {
        
        var share = this.model

        this.dropoffIds = new ( this.Collection.extend( { url: "/sharegroupdropoff" } ) )(),
        this.dropoffs = new ( this.Collection.extend( { model: this.Models.Dropoff, url: "/groupdropoff" } ) )()
        
        this.selection = 'single'

        List.prototype.postRender.call( this )

        share.set( { deliveryoptionids: new ( this.Collection.extend( { url: "/sharedeliveryoption" } ) )() } )
        share.get('deliveryoptionids').fetch( { data: { shareid: share.id } } ).done( () => {
            if( share.get('deliveryoptionids') ) {
                share.set( { deliveryoptions: new ( this.Collection.extend( { url: "/deliveryoption" } ) )() } )
                share.get('deliveryoptions')
                    .fetch( { data: { id: share.get('deliveryoptionids').map( sharedeliveryoption => sharedeliveryoption.get('deliveryoptionid') ).join(',') } } )
                    .done( () => this.items.reset( share.get('deliveryoptions').models ) )
                    .fail( e => console.log( e.stack || e ) ) 
            }
        } )

        this.on( 'itemSelected', model => {
            this[ this.util.format('%sFeedback', model.get('name') ) ]()
            this.calculateOptionCost( model )
        } )
        .on( 'itemUnselected', () => {
            this.valid = false
            this.templateData.feedback.empty()
            this.templateData.optionTotal.text('')
            if( this.model.has('selectedDelivery') ) this.model.unset('selectedDelivery')
        } )

    },

    requiresLogin: false,

    showFeedback( html ) {
        this.templateData.feedback.html( html ).show()
    },

    template: require('../../templates/signup/deliveryOptions')( require('handlebars') )
} )

module.exports = DeliveryOptions
