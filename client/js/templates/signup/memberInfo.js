module.exports = p => 
`<div class="member-info col-xs-10 col-xs-offset-1 col-sm-8 col-sm-offset-2" data-js="container">
    <div class="signup-header">Please provide us with some information about yourself</div>
    <form class="form-horizontal">` +

p.fields.map( field =>        
    `<div class="form-group">
        <label for="${field.name}" class="col-sm-3 control-label">${field.label}` +
        ( field.info ? `<span data-js="infoBtn" class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>` : `` )
        + `</label>` +
        `<div class="col-sm-9">` +
            ( field.type === 'select'
                ? `<div id="${field.name}" data-js="${field.name}"></div>`
                : `<input type="${field.type}" class="form-control" id="${field.name}" data-js="${field.name}">` +
                  `<span class="glyphicon form-control-feedback hide" aria-hidden="true"></span>`
            ) +
        `</div>
    </div>` ).join('') +
        
        `<div style="display: none;"><input type="text" id="PreventChromeAutocomplete" name="PreventChromeAutocomplete" autocomplete="address-level4" /></div>
    </form>
</div>`
