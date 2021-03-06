const Postgres = require('../dal/postgres');
const bcrypt = require('bcrypt-nodejs');

/**
 * createAdminUser.js
 *
 * Intended for use at the command line to create an admin user account in the database.
 *
 * Usage: $ node createAdminUser.js myUsername myPassword
 *
 **/

if (!process.argv[2] || !process.argv[3] || !process.argv[4]) {
	console.log('Usage: node createAdminUser.js "Real Name" myUsername myPassword');
	return 0;
}
const realName = process.argv[2];
const username = process.argv[3];
const plainPassword = process.argv[4];
const encryptedPassword = bcrypt.hashSync( plainPassword );

Postgres.initialize().then(() => {
	return Postgres.query( `INSERT INTO person (password, name, username) values ('${encryptedPassword}', '${realName}', '${username}');`, {}, {});
})
.then((result) => {
	return Postgres.query(`INSERT INTO personrole (personid, roleid) SELECT person.id, role.id from person, role where person.username = '${username}' and role.name = 'admin';`, {}, {});
})
.catch( e => console.log( e.stack || e ) )

console.log(`Admin user '${username}' created`)
return;