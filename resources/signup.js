var Base = require('./__proto__'),
    Signup = function() { return Base.apply( this, arguments ) }

Object.assign( Signup.prototype, Base.prototype, {

    Email: require('../lib/Email'),

    Stripe: require('../lib/stripe'),

    User: require('./util/User'),

    bcrypt: require('bcrypt-nodejs'),

    db: Object.assign( {}, Base.prototype.db, {
        POST() {
            this.membershareids = [ ]
            return this.executeUserQueries()
            .then( memberid => {
                this.memberid = memberid
                return this.handleFoodOmission( memberid )
            } )
            .then( () => this.Q.all( this.body.shares.map( share => this.executeShareQueries( share ) ) ) )
            .then( () => { if( Object.keys( this.body.payment ).length ) return this.executePayment( ) } )
        }
    } ),
    
    context: Object.assign( {}, Base.prototype.context, {
        POST() {
            this.body.member.password = this.bcrypt.hashSync( this.body.member.password )
            delete this.body.member.repeatpassword

            this.body.totalCents = Math.floor( this.body.total * 100 )
        }
    } ),

    executePayment() {

        return this.Q(
            this.Stripe.charge( {
                amount: this.body.totalCents,
                description: this.format( 'Purchase of CSA share(s) %s', this.body.shares.map( share => share.label ).join(', ') ),
                metadata: { memberid: this.memberid, name: this.body.member.name, email: this.body.member.email },
                receipt_email: this.body.member.email,
                source: Object.assign( { object: 'card' }, this.body.payment ),
                statement_descriptor: 'Patchwork Gardens CSA'
            } )
        )
        .fail( failedPayment => {
            return this.rollbackShareQueries()
            .fail( e => {
                console.log( this.format( '%s Error rolling back after failed payment : %s -- body -- %s', new Date(), e.stack || e, JSON.stringify(this.body) ) )
                this.error = "Error rolling back after failed payment.  Please contact us at eat.patchworkgardens@gmail.com"
            } )
            .then( () => {
                console.log( this.format( '%s Failed payment : %s -- body -- %s', new Date(), failedPayment.stack || failedPayment, JSON.stringify(this.body) ) )
                this.error = "Failed payment.  Please try again."
            } ) 
        } )
        .then( charge => {
            if( this.error ) return
            return this.Q.all( this.body.shares.map( ( share, i ) => this.Q(
                this.Postgres.query(
                    `INSERT INTO "csaTransaction" ( action, value, "memberShareId", description ) VALUES ( 'Payment', $1, ${this.membershareids[i]}, 'Stripe' )`,
                    [ share.total ] 
                )
            ) ) )
        } )
        .fail( e => console.log( `${new Date()} - Failed to credit member or create transaction : ${e.stack || e} -- body -- ${JSON.stringify(this.body)}` ) )
    },

    executeShareQueries( share ) {
        let membershareid

        return this.dbQuery( {
            query: 'INSERT INTO membershare ( memberid, shareid, paymentmethod ) VALUES ( $1, $2, $3 ) RETURNING id',
            values: [ this.memberid, share.id, ( Object.keys( this.body.payment ).length ) ? "Stripe" : "Cash" ] } )
        .then( result => {
            membershareid = result.rows[0].id
            this.membershareids.push( membershareid )
            return this.Q.all( share.options.map( option =>
                this.dbQuery( {
                    query: "INSERT INTO membershareoption ( membershareid, shareoptionid, shareoptionoptionid ) VALUES ( $1, $2, $3 ) RETURNING id",
                    values: [ membershareid, option.shareoptionid, option.shareoptionoptionid ] } ) ) )
        } )
        .spread( () => {
            return this.dbQuery( {
                query: "INSERT INTO membersharedelivery ( membershareid, deliveryoptionid, groupdropoffid ) VALUES ( $1, $2, $3 ) RETURNING id",
                values: [ membershareid, share.delivery.deliveryoptionid, share.delivery.groupdropoffid ] } )
        } )
        .then( result => {
            return this.Q.all( share.skipDays.map( date =>
                this.dbQuery( { query: "INSERT INTO membershareskipweek ( membershareid, date ) VALUES ( $1, $2 ) RETURNING id",
                                values: [ membershareid, date ] } ) ) ) 
        } )
        .then( () => this.Q(
            this.Postgres.query(
                `INSERT INTO "csaTransaction" ( action, value, "memberShareId", description ) VALUES ( 'Season Signup', $1, ${membershareid}, $2 )`,
                [ share.total, this.getShareSignupDescription(share) ]
             )
        ) )
    },

    getShareSignupDescription( share ) {
        const absent = share.skipDays.length ? `Absent: ${share.skipDays.map( day => day.slice(5) ).join(', ')}` : ``

        return `${share.options.map( option => this.getShortOptionDescription( option.description ).trim() ).join(', ')} -- ` +
               `${this.getShortDeliveryDescription( share.delivery.description )} -- ${absent}`
               
    },

    getShortOptionDescription( description ) {
        const colon = description.indexOf( ':' ),
            dash = description.indexOf( '--' )
       
        if( colon === -1 || dash === -1 ) return description
             
        return description.slice( 0, colon ) + description.slice( colon + 1, dash )
    },

    getShortDeliveryDescription( description ) {
        const match = /.*Method: (.+)/.exec( description )

        if( match === null ) return description

        return match[1].trim()
    },

    executeUserQueries() {
        return this.dbQuery( { query: "SELECT * FROM person WHERE email = $1", values: [ this.body.member.email ] } )
        .then( result => this[ `${ result.rows.length === 0 ? 'new' : 'update' }PersonQueries` ]( result.rows.length ? result.rows[0].id : undefined ) )
    },

    generateEmailBody() {
        var body = this.format('Hello %s,\r\n\r\nThanks for signing up for our CSA program.  Here is a summary for your records:\r\n\r\n', this.body.member.name)

        body += this.body.shares.map( share =>
            this.format('Share: %s\r\n\t%s%s\r\n\t%s\r\n\tShare Options:\r\n\t\t%s\r\n',
                share.label,
                share.description,
                ( share.skipDays.length )
                    ? this.format( "  You have opted out of produce for the following dates: %s.", share.skipDays.map( day => day.slice(5) ).join(', ') )
                    : "",
                share.delivery.description,
                this._( share.options ).pluck('description').join('\r\n\t\t') )
        ).join('\r\n\r\n')

        if( this.body.member.omission.length ) body += `\r\nVegetable to never receive: ${this.body.member.omission[0].name}\r\n`
        body += this.getEmailPaymentString()

        return body
    },

    getEmailPaymentString( ) {
        var total = this.body.total.toFixed(2)
        return ( Object.keys( this.body.payment ).length )
            ? this.format( "\r\n\r\nThank you for your online payment of $%s. If there is a problem with the transaction, we will be in touch.", total )
            : this.format( "\r\n\r\nYour total comes to $%s.  Please send payment at your earliest convenience to Patchwork Gardens, 9057 W Third St, Dayton OH 45417.  Thank you!", total )
    },

    handleFoodOmission( memberid ) {
        if( this.body.member.omission.length === 0 ) return this.Q()

        return this.dbQuery( {
            query: `SELECT * FROM memberfoodomission WHERE memberid = $1`,
            values: [ memberid ] } )
        .then( result => {
            var values = [ memberid, this.body.member.omission[0].produceid || this.body.member.omission[0].producefamilyid ],
                column = this.body.member.omission[0].produceid ? 'produceid' : 'producefamilyid',
                nullColumn = this.body.member.omission[0].produceid ? 'producefamilyid' : 'produceid'

            return result.rows.length === 0
                ? this.dbQuery( { query: `INSERT into memberfoodomission ( memberid, ${column} ) VALUES ( $1, $2 )`, values } )
                : this.dbQuery( { query: `UPDATE memberfoodomission SET ${column} = $2, ${nullColumn} = NULL WHERE memberid = $1`, values } )
        } )
    },

    insertMember( personid ) {
        return this.dbQuery( {
            query: "INSERT INTO member ( phonenumber, address, extraaddress, personid, heard, zipcode ) VALUES ( $1, $2, $3, $4, $5, $6 ) RETURNING id",
            values: [
                this.body.member.phonenumber,
                this.body.member.address,
                this.body.member.extraaddress,
                personid,
                this.body.member.heard,
                this.body.member.zipcode,
            ]
        } ).then( result => result.rows[0].id )
    },

    newPersonQueries() {
        return ( this.body.isAdmin
            ? this.dbQuery( {
                query: "INSERT INTO person ( email, name ) VALUES ( $1, $2 ) RETURNING id",
                values: [ this.body.member.email, this.body.member.name ]
              } )
            : this.dbQuery( {
                query: "INSERT INTO person ( email, password, name ) VALUES ( $1, $2, $3 ) RETURNING id",
                values: [ this.body.member.email, this.body.member.password, this.body.member.name ]
              } ) )
        .then( result => this.insertMember( result.rows[0].id ) )
    },

    responses: Object.assign( { }, Base.prototype.responses, {
        POST() {
            if( this.error ) return this.respond( { body: { error: this.error } } )
            this.user.state.signup = { }
            return this.Q( this.User.createToken.call(this) )
            .then( token => {
                this.token = token
                
                return this.Q( this.Email.send( {
                    to: this.body.member.email,
                    from: 'eat.patchworkgardens@gmail.com',
                    subject: 'Welcome to Patchwork Gardens CSA',
                    body: this.generateEmailBody() } )
                ).fail( err => console.log("Error generating confirmation email : " + err.stack || ere ) )
            } )
            .then( () => this.User.respondSetCookie.call( this, this.token, { } ) )
        }
    } ),

    rollbackDelivery() {
        return this.dbQuery( { query: this.format("DELETE from membersharedelivery WHERE membershareid IN ( %s )", this.membershareids.join(', ') ) } )
    },

    rollbackShareOptions() {
        return this.dbQuery( { query: this.format("DELETE from membershareoption WHERE membershareid IN ( %s )", this.membershareids.join(', ') ) } )
    },

    rollbackMemberShare() {
        return this.dbQuery( { query: this.format("DELETE from membershare WHERE id IN ( %s )", this.membershareids.join(', ') ) } )
    },

    rollbackShareQueries() {
        return [
            this.rollbackSkipWeeks.bind(this),
            this.rollbackDelivery.bind(this),
            this.rollbackShareOptions.bind(this),
            this.rollbackMemberShare.bind(this) ].reduce( this.Q.when, this.Q() )
    },

    rollbackSkipWeeks() {
        return this.dbQuery( { query: this.format("DELETE from membershareskipweek WHERE membershareid IN ( %s )", this.membershareids.join(', ') ) } )
    },


    updatePersonQueries( personid ) {
        return this.dbQuery( {
            query: "UPDATE person SET password = $1, name = $2 WHERE id = $3",
            values: [ this.body.member.password, this.body.member.name, personid ] } )
        .then( () => this.dbQuery( { query: "SELECT * FROM member WHERE personid = $1", values: [ personid ] } ) )
        .then( result => {
            var row = ( result.rows.length ) ? result.rows[0] : undefined
            if( row ) {
                return this.dbQuery( {
                     query: "UPDATE member SET phonenumber = $1, address = $2, extraaddress = $3, heard = $4, zipcode = $5 WHERE id = $6",
                     values: [
                        this.body.member.phonenumber,
                        this.body.member.address,
                        this.body.member.extraaddress,
                        this.body.member.heard,
                        this.body.member.zipcode,
                        row.id
                    ]
                } ).then( () => row.id )
            } else { return this.insertMember( personid ) }
        } )
    }
    
} )

module.exports = Signup
