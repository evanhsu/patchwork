var MyView = require('./MyView'),
    GetInvolved = function() { return MyView.apply( this, arguments ) }

Object.assign( GetInvolved.prototype, MyView.prototype, {

    getData(url) {        
        return new Promise( ( resolve, reject ) => {            
            this.$.ajax( {
                type: "GET",
                url: this.util.format("/%s", url),
                headers: { accept: "application/json" },
                success: data => resolve( data )
            } )                                  
        } )        
    },

    postRender() {
        [ 'internshipduty', 'internshipqualification', 'internshipcompensation' ].forEach( table => {
            this.getData( table ).then( data => data[ table ].forEach( datum => {
                this.templateData[ table ].append( this.templates[ table ]( datum ) )
            }) ).catch( err => new this.Error( err ) )
        } )        
    },

    requiresLogin: false,

    template: require('../templates/getInvolved')( require('handlebars') ),

    templates: {
        internshipduty: require('../templates/listItem')( require('handlebars') ),
        internshipqualification: require('../templates/listItem')( require('handlebars') ),
        internshipcompensation: require('../templates/listItem')( require('handlebars') )
    }

} )

module.exports = GetInvolved