var MyObject = require('../lib/MyObject'),
    Resource = function() { return MyObject.apply( this, arguments ) }

Object.assign( Resource.prototype, MyObject.prototype, {

    context: {
        DELETE:function(){},

        GET: function() {
            this.query = require('querystring').parse( require('url').parse( this.request.url ).query )
        },

        PATCH: function() {
            this.body = this._.omit( this.body, [ 'id', 'serverId', 'updated', 'updatedAt', 'created', 'createdAt' ] )
        },

        POST: function(){}
    },

    DELETE: function() {
        return [
            this.validate.DELETE.bind(this),
            this.context.DELETE.bind(this),
            this.db.DELETE.bind(this),
            this.responses.DELETE.bind(this) ].reduce( this.Q.when, this.Q() )
    },

    db: {
        DELETE: function() { return this.dbQuery( this.queryBuilder.deleteQuery.call( this ) ) },
        GET: function() { return this.dbQuery( this.queryBuilder.getQuery.call( this ) ) },
        PATCH: function() { return this.dbQuery( this.queryBuilder.patchQuery.call( this ) ) },
        POST: function() { return this.dbQuery( this.queryBuilder.postQuery.call( this ) ) },
    },

    dbQuery: data => new ( require('../dal/postgres') )( { connectionString: process.env.POSTGRES } ).query( data.query, data.values ),

    GET: function() {
        return [
            this.validate.GET.bind(this),
            this.context.GET.bind(this),
            this.db.GET.bind(this),
            this.responses.GET.bind(this) ].reduce( this.Q.when, this.Q() )
    },

    getHeaders: function( body ) { return this._.extend( {}, this.headers, { 'Date': new Date().toISOString(), 'Content-Length': Buffer.byteLength( body ) } ) },

    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Keep-Alive': 'timeout=50, max=100',
    },

    handleIncomingData: function( someData ) {

        this.body += someData;

        if( this.body.length > 1e6 ) {
            this.request.connection.destroy();
            throw new Error("Too much data");
        }
    },

    handleRequestEnd: function() {

        if( this.body.length === 0 ) this.body = "{}"

        try {
            this.body = JSON.parse( this.body );
        } catch( e ) {
            return this.requestEnded.reject( 'Unable to parse request : ' + e );
        }

        if( ! this._.has( this.validate, this.request.method ) ) return this.requestEnded.reject('Invalid Request')

        this.Q.fcall( this.validate[ this.request.method ].bind(this) )
            .then( this.requestEnded.resolve.bind(this) )
            .fail( this.requestEnded.reject.bind(this) )
            .done();
    },

    jws: require('jws'),

    PATCH: function() {
        return [
            this.slurpBody.bind(this),
            this.context.PATCH.bind(this),
            this.db.PATCH.bind(this),
            this.responses.PATCH.bind(this) ].reduce( this.Q.when, this.Q() )
    },

    POST: function() {
        return [
            this.slurpBody.bind(this),
            this.context.POST.bind(this),
            this.db.POST.bind(this),
            this.responses.POST.bind(this) ].reduce( this.Q.when, this.Q() )
    },

    queryBuilder: require('../lib/queryBuilder'),

    relations: [ ],

    respond: function( data ) {
        data.body = JSON.stringify( data.body );
        this.response.writeHead( data.code || 200, this._.extend( this.getHeaders( data.body ), data.headers || {} ) )
        this.response.end( data.body );
    },

    responses: {
        
        DELETE: function( result ) { this.respond( { body: { success: true } } ) },

        GET: function( result ) {
            var body = ( this.path.length > 2 ) ? ( ( result.rows.length ) ? result.rows[0] : { } ) : result.rows
            return this.respond( { body: { success: true, result: body } } )
        },

        PATCH: function( result ) {
            var payload = { body: { success: true } };

            if( this.request.headers.iosapp ) payload.body.result = { updatedAt: result.rows[0].updatedAt }

            this.respond( payload )
        },

        POST: function( result ) {
            this.respond( { body: {
                success: true,
                result: ( this.request.headers.iosapp )
                    ? this._.pick( result.rows[0], [ 'serverId', 'createdAt', 'updatedAt' ] )
                    : result.rows[0].id
            } } )
        }
    },

    slurpBody: function() {

        this.requestEnded = this.Q.defer();

        this.body = "";
        
        this.request.on( "data", this.handleIncomingData.bind(this) );

        this.request.on( "end", this.handleRequestEnd.bind(this) );

        return this.requestEnded.promise;
    },

    transform: function( obj, mapping ) {
        this._.each( obj, ( value, key ) => {
            if( this._.has( mapping, key ) ) {
                obj[ mapping[ key ] ] = value;
                delete obj[ key ]
            } 
        }, this )
    },

    validate: {

        DELETE: function() {

            this.validate.Token.call(this)
            
            if( this.path.length !== 3 || Number.isNaN( parseInt( this.path[2], 10 ) ) ) throw new Error("Invalid resource id")

            return this.validate.User.call(this)
        },

        GET: function() {

            this.validate.Token.call(this)

            if( this.path.length > 2 && Number.isNaN( parseInt( this.path[2], 10 ) ) ) throw new Error("Invalid resource id")
            
            return this.validate.User.call(this)
        },

        PATCH: function() {
            
            this.validate.Token.call(this)

            if( this.path.length !== 3 || Number.isNaN( parseInt( this.path[2], 10 ) ) ) throw new Error("Invalid resource id")

            return this.validate.User.call(this)
        },

        POST: function() {
            if( /(auth)/.test(this.path[1]) ) return
            
            this.validate.Token.call(this)
            
            return this.validate.User.call(this)
        },
    
        Token: function() {
            var list = {},
                rc = this.request.headers.cookie

            rc && rc.split(';').forEach( cookie => {
                var parts = cookie.split('=');
                list[ parts.shift().trim() ] = parts.join('=')
            } )

            this.token = list.patchworkjwt
        },

        User() {
            return new Promise( ( resolve, reject ) => {
                this.jws.createVerify( {
                    algorithm: "HS256",
                    key: process.env.JWS_SECRET,
                    signature: this.token,
                } ).on( 'done', ( verified, obj ) => {
                    if( ! verified ) reject( 'Invalid Signature' )
                    this.user = obj.payload
                    resolve()
                } ).on( 'error', reject )
            } )
        }
    }

} );

module.exports = Resource;
