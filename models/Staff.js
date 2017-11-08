const Super = require('./__proto__')

module.exports = {

    attributes: Super.createAttributes( [
        {
            name: 'name',
            label: 'Name',
            range: 'String'
        },
        {
            name: 'bio',
            label: 'Bio',
            range: 'Text'
        }, {
            name: 'image',
            label: 'Image',
            range: 'ImageUrl'
        }
    ] )

}