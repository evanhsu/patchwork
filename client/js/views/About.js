const CustomContent = require('./util/CustomContent')

module.exports = Object.assign( {}, require('./__proto__'), CustomContent, {

    events: {
        link: 'click'
    },

    onLinkClick( e ) {
        this.emit( 'navigate', e.target.getAttribute('data-name') )
    },

    tables: [ 
        { name: 'Staff', el: 'staff', template: 'staffProfile' }
    ],

    templates: {
        staffProfile: require('./templates/StaffProfile')
    }

} )
