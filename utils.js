// A dummy utils.js for local development
let data = {
    tokbox_project: '',
    tokbox_key: '',
    tokbox_secret: ''
}

let id = '565'; // any random number

module.exports = {
  getDb: () => {},
  getNexmo: (id) => new Promise((resolve, reject) => {
    resolve(data);
  }),
  getIdFromJWT: (token) => {return id},
  getBearerToken: () => {return id},
  getIniStuff: () => {
    return data;
  }
}