const utils = require('../../utils');
const path = require('path')
require("dotenv").config({path: path.resolve(__dirname, '../.env')});
const express = require('express');
const cors = require('cors');

const bodyParser = require('body-parser');
const app = express(); // create express app
require('dotenv').config();
app.use(express.static(path.join(__dirname, '../dist')));
app.use(cors());
app.use(bodyParser.json());


const OpenTok = require("opentok");
let sessions = {};
let opentok = {};
let gnids = utils.getIniStuff();

app.get('/', (req, res, next) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });

app.get('/session', async (req, res) => {
  try {
    let jwt = req.body.jwt;
    let id = getId(jwt); 
    if (id < 0) {
      return res.status(401).end();
    }
    const roomName = "zoom-room-" + id; 

    console.log("rommname", roomName)
    const result = await utils.getNexmo(id);
    console.log("result", result)

    opentok[id] = new OpenTok(result.tokbox_key, result.tokbox_secret);
    if (sessions[roomName]) {
      const data = generateToken(id, sessions[roomName]);
      res.json({
        sessionId: sessions[roomName],
        token: data.token,
        apiKey: result.tokbox_key,
      });
    } else {
      const data = await getCredentials(id);
      sessions[roomName] = data.sessionId;
      res.json({
        sessionId: data.sessionId,
        token: data.token,
        apiKey: result.tokbox_key,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send({ message: error.message });
  }
});

const getId = (jwt) => {
  let id = utils.getIdFromJWT(gnids, jwt);
  // let id = parseJwt(jwt);
  if (id <= 0) {
    return -1;
  }
  return id;
}


const createSessionandToken = (id) => {
    return new Promise((resolve, reject) => {
      opentok[id].createSession({ mediaMode: 'routed' }, function (error, session) {
        if (error) {
          reject(error);
        } else {
          const sessionId = session.sessionId;
          const token = opentok[id].generateToken(sessionId);
          resolve({ sessionId: sessionId, token: token });
        }
      });
    });
  };
  
  const generateToken = (id, sessionId) => {
    const token = opentok[id].generateToken(sessionId);
    return { token: token };
  };
  
  const getCredentials = async (id, session = null) => {
    const data = await createSessionandToken(id, session);
    const sessionId = data.sessionId;
    const token = data.token;
    return { sessionId: sessionId, token: token };
  };
  
const serverPort = process.env.PORT || 5000;
// start express server on port 5000
app.listen(serverPort, () => {
  console.log('server started on port', serverPort);
});