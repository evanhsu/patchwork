module.exports = Object.create( {

    buildSelect: function() {

        var selectArray = this.tables[ this.name ].map( column => {
            var rv;
            if( this.request.headers.iosapp && ( column === "updated" || column === "created" || column === "birthdate" ) ) {
                rv = this.util.format( 'FLOOR(EXTRACT(EPOCH FROM %s.%s))||to_char(%s.%s,\'.US\')', this.name, column, this.name, column )
            } else {
                rv = this.util.format( '%s.%s', this.name, column )
            }
            if( this.request.headers.iosapp && this.transformer.to.iOS[ column ] ) rv += this.util.format(' AS "%s"', this.transformer.to.iOS[ column ] )
            else if( column === "birthdate" ) rv += ' AS "birthdate"'
            return rv;
        }, this );

        return selectArray.join(", ");
    },
    
    buildFrom: function() {

        var rv = this.name + " ";

        this.relations.forEach( relation => {
            rv += this.util.format('JOIN %s %s ON %s.%s = %s.%s ', relation.table, relation.tableReference, relation.tableReference,
                                                                   relation.foreignKey, this.name, relation.column) }, this )

        return rv;
    },

    buildSet: function( columns ) {
        return columns.map( function( column, idx ) { return column + " = $" + (idx+1).toString() } ).join(", ")
    },

    buildWhere: function() {

        var rv = { string: '', values: [ ] }

        if( this.path.length > 2 ) {
            rv.string = this.util.format('%s.id = $1',this.name)
            rv.values = this.path[2]
        }

        return rv
    },

    deleteQuery: function() {
        return { query: this.util.format('UPDATE %s SET isdeleted = true WHERE id = $1', this.name), values: [ this.path[2] ] }
    },

    getAllTables: function() {
        return this.util.format(
            "SELECT table_name",
           "FROM information_schema.tables",
           "WHERE table_schema='public'",
           "AND table_type='BASE TABLE';" )
    },

    getQuery: function() {
        var selectArray = this.tables[ this.name ].map( column => {
            var rv;

            if( this.request.headers.iosapp && ( column === "updated" || column === "created" || column === "birthdate" ) ) {
                rv = this.util.format( 'FLOOR(EXTRACT(EPOCH FROM %s.%s))||to_char(%s.%s,\'.US\')', this.name, column, this.name, column )
            } else {
                rv = this.util.format( '%s.%s', this.name, column )
            }

            if( this.request.headers.iosapp && this.transformer.to.iOS[ column ] ) rv += this.util.format(' AS "%s"', this.transformer.to.iOS[ column ] )
            else if( column === "birthdate" ) rv += ' AS "birthdate"'
            return rv;
        }, this ),
            ctr = 1,
            fromString = this.name + " ",
            where = { clause: "", stringArray: [], values: [ ] }

        if( this.path.length > 2 ) {

            where.stringArray.push( this.util.format('%s.id = $%d',this.name,ctr++) )
            where.values.push( this.path[2] )
        }

        if( ! this.request.headers.iosapp && this._( this.tables[ this.name ] ).contains('isdeleted') ) {
            where.stringArray.push( this.util.format('%s.isdeleted = false',this.name) ) }

        this._.each( this.query, function( value, key ) {

            if( key === "updatedAt" ) {
                where.stringArray.push( this.util.format('%s.%s > (SELECT to_timestamp($%d))', this.name, "updated", ctr++ ) )
                where.values.push( parseFloat(value) )
            } else {
                where.stringArray.push( this.util.format('%s.%s = $%d', this.name, key, ctr++ ) )
                where.values.push( value )
            }

        }, this )
        
        if( where.stringArray.length ) where.clause = "WHERE " + where.stringArray.join(" AND ")

        return {
            query: this.util.format( 'SELECT %s FROM %s %s', selectArray.join(", "), fromString, where.clause ),
            values: where.values
        }
    },

    getTableColumns: function( tableName ) {
        return this.util.format(
            'SELECT column_name',
            'FROM information_schema.columns',
            this.util.format( "WHERE table_name = '%s';", tableName ) )
    },


    patchQuery: function() {
        var contextFilter = ''
            ctr = 2,
            setArray = [],
            values = [ this.path[2] ],
            returning = "";

        this._.each( this.body, function( value, key ) {
            var dbKey = ( this.request.headers.iosapp ) ? ( this.transformer.from.iOS[ key ] || key ) : key;

            if( this._.contains( [ "created", "id", "updated" ], key ) ) return 

            if( this.request.headers.iosapp && dbKey === 'birthdate' ) { 
                setArray.push(this.util.format('%s = (select to_timestamp($%s)::date)', dbKey, ctr++))
            } else {
                setArray.push(this.util.format('%s = $%s', dbKey, ctr++))
            }
            values.push( value )
        }, this )

        if( this.contextFilter ) {
            contextFilter = ' AND '
            
            this.contextFilter.forEach( filter => {
                contextFilter += this.util.format( '%s = $%d ', filter.column, ctr++ )
                values.push( filter.value )
            }, this )
        }

        if( this.request.headers.iosapp && this._.contains( this.tables[ this.name ], "created" ) ) {
            returning = 'RETURNING FLOOR(EXTRACT(EPOCH FROM updated))||to_char(updated,\'.US\') as "updatedAt"'
        }

        return {
            query: this.util.format( 'UPDATE %s SET %s WHERE id = $1%s %s;', this.name, setArray.join(', '), contextFilter, returning ),
            values: values
        }
    },

    postQuery: function() {
        var columnString = '', variableString = '', ctr = 1, values = [],
            returning = "RETURNING id";

        this._.each( this.body, function( value, key ) {
            if( this._.contains( [ "created", "createdAt", "id", "serverId", "updated", "updatedAt" ], key ) ) return 
            columnString += ( ( this.request.headers.iosapp ) ? ( this.transformer.from.iOS[ key ] || key ) : key ) + ', '
            variableString += this.util.format('$%d',ctr++) + ', '
            values.push( value )
        }, this )

        if( this.request.headers.iosapp && this._.contains( this.tables[ this.name ], "created" ) ) {
            returning += ' as "serverId", FLOOR(EXTRACT(EPOCH FROM created))||to_char(created,\'.US\') as "createdAt", '
            returning += 'FLOOR(EXTRACT(EPOCH FROM updated))||to_char(updated,\'.US\') as "updatedAt"'
        }

        return {
            query: this.util.format( 'INSERT INTO %s ( %s ) VALUES ( %s ) %s;', this.name, columnString.slice(0,-2), variableString.slice(0,-2), returning ),
            values: values
        }
    }

} )
