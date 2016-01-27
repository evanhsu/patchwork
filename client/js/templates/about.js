module.exports = function(Handlebars) {

return Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "        <div class=\"bio clearfix\"><img src=\""
    + alias2(alias1((depth0 != null ? depth0.path : depth0), depth0))
    + "\" alt=\""
    + alias2(alias1((depth0 != null ? depth0.description : depth0), depth0))
    + "\"><div class=\"inner\"><h3>"
    + alias2(alias1((depth0 != null ? depth0.description : depth0), depth0))
    + "</h3><div>filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler filler </div></div></div><hr>        ";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"about-class client-view\" data-js=\"container\"><h2>About Us</h2><p>Patchwork Gardens is a chemical-free farm located in Dayton, Ohio.  Every spring, we plant a large vegetable garden: 11 acres in the widest variety we can manage.  We try to cover all the garden favorites: from salad greens in spring, to summer-time tomatoes, autumn's root crops and everything in between.  If you've ever had a home garden and enjoyed its fresh foods, then you may be familiar with the crops we cultivate.  If you cherish a fondness for any vegetable at all, the chances are good that we are growing this now.<p><p>It is our goal to spread good food and good farming practices within our community.  The farm is in its seventh year now, and growing more productive every year we learn from our experience.  We grow our food without the use of any chemical fertilizers, pesticides, or herbicides.  Our approach to agriculture favors hard work (diligent cultivation) and the culture of a healthy soil biology.  These make for healthy plants.  We plant cover-crops in the off-season and monitor our progress through yearly soil testing.</p><p>Most of what we grow gets directly distributed to our favorite folks -- the hungry, healthy membership of our Community Supported Agriculture (CSA) program.  Members of this program receive the lion's share of each week's harvest, a box of produce picked and packed according to what's most-ready in the garden.  The CSA runs mid-May -January and showcases all the variety of foods that we produce.  We also attend farmer's markets and contract with local restaurants.  We’re proud to be growing great vegetables and are eager to share them.  Check us out at farmer's market or consider becoming a part of our CSA today.</p><hr><div class=\"staff-bios\"><h2>Meet Our Staff</h2>        "
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.images : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div></div>    ";
},"useData":true});

};