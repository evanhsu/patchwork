var List = require('../util/List'),
    Delivery = function() { return List.apply( this, arguments ) }

Object.assign( Delivery.prototype, List.prototype, {

    ItemView: require('./DeliveryOptions'),

    getItemViewOptions() { return { container: this.templateData.shares, signupData: this.signupData } },
    
    itemModels() { return this.signupData.shares },

    requiresLogin: false,

    template: require('../../templates/signup/delivery')( require('handlebars') ),

    validate() {
        var valid = true

        Object.keys( this.itemViews ).forEach( id => {
            if( ! this.itemViews[id].valid ) valid = false
        } )

        if( !valid ) this.templateData.container.addClass('has-error')

        return valid
    }

} )

module.exports = Delivery
