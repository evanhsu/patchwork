module.exports = new (
    require('backbone').Router.extend( {

        $: require('jquery'),
        Error: require('../../lib/MyError'),
        Resource: require('./views/Resource'),

        ViewFactory: require('./factory/View'),

        initialize: function() {
            this.content = document.querySelector('#content')

            this.user = require('./models/User')

            this.userPromise = new Promise( ( resolve, reject ) => this.user.fetch().done( resolve ).fail( reject ) )

            this.footer = this.ViewFactory.create( 'footer', { insertion: { value: { el: this.content, method: 'after' } } } )

            this.views = { }

            return this;
        },

        handleHeader( resource ) {
            if( /admin/.test(resource) ) {
                if( this.adminHeader ) { this.adminHeader.onNavigation() }
                else { this.adminHeader = this.ViewFactory.create( 'adminHeader', { insertion: { value: { el: this.content, method: 'insertBefore' } } } ) }
            } else {
                if( this.adminHeader ) { this.adminHeader.hide() }
                if( this.header ) { this.header.onNavigation( resource ) }
                else {
                    this.header = this.ViewFactory.create( 'header', { insertion: { value: { el: this.content, method: 'insertBefore' } } } )
                    this.header.onNavigation( resource ) }
            }
        },

        handleFooter( resource ) {
            this.footer.els.container.classList.toggle( 'hidden', /admin/.test( resource ) )
        },

        handler( resource ) {
            if( !resource ) resource = 'home'

            this.handleHeader( resource )
            this.handleFooter( resource )
          
            this.userPromise.then( () => {
                if( this.user.id && /admin/.test(resource) ) this.header.onUser( this.user )

                this.$('body').removeClass().addClass( resource )
                
                Object.keys( this.views ).forEach( view => this.views[ view ].hide() )
                
                if( this.views[ resource ] ) this.views[ resource ].show()
                else this.views[ resource ] = resource === "admin-plus"
                    ? this.ViewFactory.create( resource, {
                        insertion: { value: { el: this.content } },
                        user: { value: this.user } } )
                        .on( 'navigate', route => this.navigate( route, { trigger: true } ) )
                        .on( 'deleted', () => delete this.views[lower] )
                    : new ( this.resources[ resource ].view )( this.resources[ resource ].options )
                        .on( 'navigate', data => this.navigate( data.location, data.options ) )
                        
                if( !/admin/.test( resource ) ) {  
                    if( this.header.els.headerTitle.style.display === 'none' ) this.header.toggleLogo()
                    this.header.els.navbarCollapse.classList.remove('in')
                    document.body.scrollTop = 0
                    this.footer.size()
                }

            } ).catch( err => new this.Error(err) )
        },

        onSignout() {
            Object.keys( this.views ).forEach( name => {
                this.views[ name ].delete()
                delete this.views[name] 
            } )
        
            this.navigate( "/", { trigger: true } )
        },
        
        resourceHandler( resource ) {
            this.header = require('./views/AdminHeader')

            if( this.footer ) this.footer.hide()

            this.userPromise.then( () => {

                if( this.user.id ) this.header.onUser( this.user )

                Object.keys( this.views ).forEach( key => this.views[key].hide() )

                if( this.views.resource ) return this.views.resource.update( resource )

                this.views.resource = new this.Resource( { resource: resource } )

            } ).catch( err => new this.Error(err) )
        },

        adminPlusHandler( resource ) {
            this.header = require('./views/AdminHeader')

            if( this.footer ) this.footer.hide()

            this.userPromise.then( () => {

                if( this.user.id ) this.header.onUser( this.user )

                Object.keys( this.views ).forEach( key => this.views[key].hide() )

                if( this.views[ resource ] ) return this.views[ resource ].onNavigation( resource )

                this.views[ resource ] =
                    this.ViewFactory.create( resource, {
                        insertion: { value: { el: this.content } },
                        user: { value: this.user }
                    } )
                    .on( 'navigate', route => this.navigate( route, { trigger: true } ) )
                    .on( 'deleted', () => delete this.views[lower] )
            } )
            .catch( this.Error )
        },

        resources: {

            admin: {
                view: require('./views/Admin'),
                options: {
                    collection: {
                        comparator: "name",
                        model: require('./models/Resource'),
                        parse: response => response.resource,
                        url: "/"
                    },
                    fetch: { headers: { accept: "application/ld+json" } }
                }
            },
            home: { view: require('./views/Home'), options: { } },
            csa: { view: require('./views/CSA'), options: { } },
            about: { view: require('./views/About'), options: { } },
            markets: { view: require('./views/Markets'), options: { } },
            "sign-up": { view: require('./views/Signup'), options: { } },
            members: { view: require('./views/Members'), options: { } },
            "get-involved": { view: require('./views/GetInvolved'), options: { } },
            contact: { view: require('./views/Contact'), options: { } }
        },

        routes: {
            '': 'handler',
            ':resource': 'handler',
            'admin/:resource': 'resourceHandler',
            'admin-plus/:resource': 'adminPlusHandler'
        }

    } )
)()
