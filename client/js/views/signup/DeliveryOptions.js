var List = require('../util/List'),
    DeliveryOptions = function() { return List.apply( this, arguments ) }

Object.assign( DeliveryOptions.prototype, List.prototype, {

    ItemView: require('./DeliveryOption'),

    Models: {
        DeliveryRoute: require('../../models/DeliveryRoute'),
    },

    Views: {
        Dropoffs: require('./Dropoffs')
    },

    farmFeedback( model ) {
        this.farmPickup = new ( this.Models.DeliveryRoute.extend( { parse: response => this.Models.DeliveryRoute.prototype.parse( response[0] ) } ) )()
        this.farmPickup.fetch( { data: { label: 'farm' } } ).done( () => {
            if( Object.keys( this.farmPickup.attributes ).length === 0 ) {
                this.valid = false
                return this.showFeedback( this.feedback.noFarmRoute() )
            }
            
            this.showFeedback( this.feedback.farm( this.farmPickup.attributes ) )

            this.selectedDelivery = Object.assign( {}, { deliveryoptionid: model.id }, this.farmPickup.pick( [ 'dayofweek', 'starttime', 'endtime' ] ) )

            this.valid = true
        } )
    },
    
    feedback: {
        home: require('../../templates/signup/homeDeliveryFeedback')( require('handlebars') ),
        farm: require('../../templates/signup/farmPickupFeedback')( require('handlebars') ),
        invalidZip: function( zipcode ) {
            return this.util.format( 'Postal Code of %s is not in our delivery area.  Please contact us to discuss options.', zipcode )
        },
        noFarmRoute: function() { return "There is currently an error with On-Farm Pickup selection." }
    },

    getItemViewOptions() { return { container: this.templateData.options } },

    getTemplateOptions() { return this.model.attributes },

    groupFeedback( deliveryOption ) {

        this.groupDropoffPromise.then( () => {

            this.dropoffView = new this.Views.Dropoffs( { container: this.templateData.feedback } )
                .on( 'itemUnselected', () => {
                    this.dropoffView.itemViews.forEach( view => {
                        if( view.templateData.container.is(':hidden') ) view.templateData.container.show()
                    })

                    this.valid = false 
                } )
                .on( 'itemSelected', model => {
                    var selectedId = model.id
                    
                    this.model.get('groupdropoffs').forEach( model => {
                        if( model.id !== selectedId ) this.dropoffView.itemViews[ model.id ].templateData.container.hide()
                    } )

                    this.selectedDelivery = Object.assign( {},
                        { deliveryoptionid: deliveryOption.id, groupdropoffid: model.id },
                        model.pick( [ 'dayofweek', 'starttime', 'endtime' ] ) )
                    
                    this.valid = true
                } )
                .on( 'itemAdded', model => {
                    var selectedDelivery = this.model.get('selectedDelivery')
                    if( selectedDelivery &&
                        Object.keys( this.dropoffView.itemViews ).length == this.dropoffView.items.length &&
                        this.dropoffView.itemViews[ selectedDelivery.groupdropoffid ] ) {
                        
                        this.dropoffView.selectItem( this.dropoffView.items.get( selectedDelivery.groupdropoffid ) )
                    }
                } )

            this.dropoffView.items.reset( this.model.get('groupdropoffs').models )

            if( this.model.get('groupdropoffs').length === 0 ) {
                this.dropoffView.templateData.message.text("No available group dropoff locations, please select another option") }

        } )
    },

    homeFeedback( deliveryOption ) {
        var addressModel = this.user.get('addressModel'),
            userPostalCode = ( addressModel ) ? addressModel.postalCode : undefined

        if( !userPostalCode ) {

            this.showFeedback('<div class="message">Because we could not lookup your address, we are currently unable to provide a delivery day for the week or time.  We will take care of this in the next step by having you verify your address.</div>')

            this.selectedDelivery = { deliveryoptionid: deliveryOption.id, isHome: true }
            
            return this.valid = true
        }

        this.zipRoute = new ( this.Model.extend( { parse: response => response[0], urlRoot: "/zipcoderoute" } ) )()
        this.homeDeliveryRoute = new this.Models.DeliveryRoute()

        this.zipRoute
            .fetch( { data: { zipcode: userPostalCode } } )
            .done( () => {
                if( Object.keys( this.zipRoute.attributes ).length === 0 ) {
                    this.valid = false
                    return this.showFeedback( this.feedback.invalidZip.call( this, userPostalCode ) )
                }    
                this.homeDeliveryRoute.set( { id: this.zipRoute.get('routeid') } )
                .fetch()
                .done( () => {
                    this.showFeedback( this.feedback.home( this.homeDeliveryRoute.attributes ) )
                    
                    this.selectedDelivery = Object.assign(
                        { deliveryoptionid: deliveryOption.id, isHome: true },
                        this.homeDeliveryRoute.pick( [ 'dayofweek', 'starttime', 'endtime' ] )
                    )
                    
                    this.valid = true
                } )
            } )
    },

    postRender() {
        
        var share = this.model

        this.selection = 'single'

        List.prototype.postRender.call( this )

        this.on( 'itemAdded', model => {
            var price = parseFloat( model.get('price').replace(/\$|,/g, "") ),
                selectedDelivery = this.model.get('selectedDelivery')
            
            if( price == 0 ) this.itemViews[ model.id ].templateData.deliveryPrice.text( "No charge" )
            else if( price < 0 ) this.itemViews[ model.id ].templateData.deliveryPrice.text( this.util.format('Save %s per week', model.get('price').replace('-','') ) )

            if( selectedDelivery && selectedDelivery.deliveryoptionid == model.id ) this.selectItem( model )
        } )

        share.getDeliveryOptions()
        .then( () => {
            var deliveryOptions = share.get('deliveryoptions')

            this.items.reset( deliveryOptions.models )

            if( deliveryOptions.length === 0 ) this.templateData.options.text('This share does not have delivery options associated with it.  Please contact Patchwork and sign up for this particular share at a later date.')
        } )
        .fail( e => console.log( e.stack || e ) )
        .done()

        this.on( 'itemSelected', model => {
            this.templateData.container.removeClass('has-error')
            this[ this.util.format('%sFeedback', model.get('name') ) ]( model )            
        } )
        .on( 'itemUnselected', () => {
            this.valid = false
            this.templateData.feedback.empty()
        } )

        this.groupDropoffPromise = share.getGroupDropoffs()

        this.user.on( 'change:address', () => {
            var selectedIds = Object.keys( this.selectedItems )

            if( selectedIds.length === 0 ) return

            this.unselectItem( this.items.get( selectedIds[0] ) )
        } )
    },

    requiresLogin: false,

    showFeedback( html ) {
        this.templateData.feedback.html( html ).show()
    },

    template: require('../../templates/signup/deliveryOptions')( require('handlebars') )
} )

module.exports = DeliveryOptions
