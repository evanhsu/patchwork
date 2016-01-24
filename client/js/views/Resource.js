var Table = require('./util/Table'),
    Resource = function() { return Table.apply( this, arguments ) }

Object.assign( Resource.prototype, Table.prototype, {

    Instance: require('../models/Instance'),

    ItemView: require('./InstanceRow'),

    collection() {
        return {
            model: this.Instance,
            parse: response => {
                this.label = response.label;
                if( response.operation["@type"] === "Create" ) this.createProperties = response.operation.expects.supportedProperty
                return response[ this.resource ]
            },
            url: this.util.format( "/%s", this.resource )
        }
    },

    create( data ) {

        this.createProperties.forEach( property => {
            if( property.fk ) { data[ property.property ] = this[ property.fk.table + "Typeahead" ].id }
        } )

        this.$.ajax( {
            headers: { accept: 'application/json' },
            contentType: 'application/json',
            data: JSON.stringify( data ),
            method: 'POST',
            url: this.util.format( "/%s", this.resource )
        } )
        .done( ( response, textStatus, jqXHR ) => {
            if( this.items.length === 0 ) this.setFields( response )
            this.items.add( response )
            this.modalView.hide()
        } )
            
    },

    events: {
        'createBtn': { method: 'showCreateDialog' },
        'body': [
            { event: 'mouseenter', selector: 'tr', method: 'onRowMouseEnter' },
            { event: 'mouseleave', selector: 'tr', method: 'onRowMouseLeave' }
        ]
    },

    fetch: { headers: { accept: "application/ld+json" } },

    getLabel( property ) {
        return this.format.capitalizeFirstLetter( property )
    },

    initTypeahead( property ) {

        var bloodhound = new Bloodhound( {
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
            identify: obj => obj.id,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                filter: response => response[ property.fk.table ],
                replace: (url, query) => url.replace( '%QUERY', encodeURIComponent (query ) ),
                url: this.util.format( "/%s?name=%QUERY", property.fk.table )
            }
        } ),
        el = this.$( '#' + property.property )

        bloodhound.initialize()

        el.typeahead( { hint: true }, { display: obj => obj.name, source: bloodhound.ttAdapter() } )
        .bind( 'typeahead:selected typeahead:autocompleted', ( obj, selected, name ) => {
            this[ property.fk.table + "Typeahead" ] = selected
            el.one( 'change', () => this[ property.fk.table + "Typeahead" ] = undefined )
        } )
    },

    onRowMouseEnter( e ) {
        var row = this.$( e.currentTarget ),
            position = row.position()

        console.log( this.templateData )
        //[ 'deleteBtn', 'editBtn' ].forEach( btn => this.templateData[ btn ].removeClass('hide').css( { top: position.top, right: '5px' } ) )
        [ 'deleteBtn', 'editBtn' ].forEach( function( btn ) {
            console.log( this )
            console.log( btn )
            this.templateData[ btn ].removeClass('hide').css( { top: position.top, right: '5px' } )
        }, this )
    },
    
    onRowMouseLeave() {
        [ 'deleteBtn', 'editBtn' ].forEach( function( btn ) { this.templateData[ btn ].addClass('hide') }, this )
    },

    postRender() {
        Table.prototype.postRender.call(this)
        this.items.on( 'reset', () => { this.templateData.subHeading.text( this.label ) } )
    },

    setFields( instance ) {
        var keys = Object.keys( instance ), width = Math.floor( 100 / keys.length )
        this.fields = keys.map( key => {
            var field = { name: key, label: this.format.capitalizeFirstLetter( key ), width: width }
            this.$( this.templateData.header.children('tr')[0] ).append( this.templates.headerColumn.call( this, field ) )
            return field
        } )
    },

    showCreateDialog() {

        this.modalView.show( {
            body: this.templates.create( {
                fields: this.createProperties.map( property => 
                    this.templates[ property.range ]( {
                        class: ( property.fk ) ? 'typeahead' : '',
                        name: property.property,
                        label: this.getLabel( property.property )
                    } )
                )
            } ),
            title: this.util.format( 'Create %s', this.label )
        } )
        .on( 'shown', () => this.createProperties.forEach( property => { if( property.fk ) { this.initTypeahead( property ) } } ) )
        .on( 'submit', data => this.create(data) )


    },

    template: require('../templates/resource')( require('handlebars') ),

    templates: Object.assign( {}, Table.prototype.templates, {
        'create': require('../templates/createInstance')( require('handlebars') ),
        'Float': require('../templates/form/Text')( require('handlebars') ),
        'Integer': require('../templates/form/Text')( require('handlebars') ),
        'Text': require('../templates/form/Text')( require('handlebars') ),
    } )

} )

module.exports = Resource