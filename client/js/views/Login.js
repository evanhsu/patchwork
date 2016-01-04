var MyView = require('./MyView'),
    Login = function() { return MyView.apply( this, arguments ) };

Object.assign( Login.prototype, MyView.prototype, require('./util/Form').prototype, {

    checkForEnter( e ) { if( e.keyCode === 13 ) this.login() },

    events: {
        'loginBtn': { method: 'login' }
    },

    fields: [
            { name: "username", label: 'Username', type: 'text', error: "Please enter a valid email address.", validate: val => val.length >= 6 },
            { name: "password", label: 'Password', type: 'password', error: "Passwords must be at least 6 characters long.", validate: val => val.length >= 6 }
    ],

    getTemplateOptions() { return { fields: this.fields } },

    login() { this.submitForm( { resource: "auth" } ) },

    name: "Login",

    onSubmissionResponse( response ) {
        
        if( Object.keys( response ).length === 0 ) {
            return this.slurpTemplate( { template: this.templates.invalidLoginError( response ), insertion: { $el: this.templateData.container } } )
        }
        
        this.$(document).off( 'keyup', this.checkForEnter.bind(this) )
    
        require('../models/User').set( response );
        this.emit( "success" );
        this.hide().done();
    },

    postRender() {
        this.templateData.container.find( 'input' ).on( 'focus', this.removeErrors.bind(this) )
        this.$(document).on( 'keyup', this.checkForEnter.bind(this) )
    },

    requiresLogin: false,

    template: require('../templates/login')( require('handlebars') )

} )

module.exports = new Login()