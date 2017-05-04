const app = require('drachtio')() ;
const Mrf = require('drachtio-fsmrf') ;
const mrf = new Mrf(app) ;
const Srf = require('drachtio-srf') ;
const srf = new Srf(app) ;
const async = require('async') ;

srf.connect({
  host: '127.0.0.1',
  port: 9022,
  secret: 'cymru',
}) 
.on('connect', (err, hostport) => { console.log(`connected to drachtio listening on ${hostport}`) ;})
.on('error', (err) => { console.error(`Error connecting to drachtio at ${err || err.message}`) ; }) ;

// on startup, connect to media server, create a conference, and start recording it
async.waterfall([
  (callback) => {
    mrf.connect({
      address: '127.0.0.1',
      port: 8021,
      secret: 'ClueCon'
    }, (ms) => {
      callback(null, ms) ;
    });
  },
  (ms, callback) => {
    ms.createConference('testconf', (err, conf) => {
      if( err ) { return callback(err); }
      callback(null, ms, conf) ;
    });
  },
  (ms, conf, callback) => {
    conf.startRecording('/usr/local/freeswitch/recordings/record.wav', (response) => {
      if( response.body && /-ERR/.test(response.body) ) {
        return callback(new Error(response.body)) ;
      }
      console.log('conference established...');
      callback(null, ms, conf) ;
    });
  } 
], (err, ms, conf) => {
  if( err ) {
    throw err ;
  }

  // save ms and conference objects so we can access them from middleware
  srf.locals.ms = ms ;
  srf.locals.conf = conf ;
}) ;


// add new callers into the conference
srf.invite( (req, res) => {
  let ms = req.app.locals.ms ;
  let conf = req.app.locals.conf ;

  // connect caller to media server
  ms.connectCaller(req, res, {
    codecs: ['PCMU']
  }, (err, ep, dlg) => {
    if( err ) { 
      console.log(`${req.get('Call-Id')}: FAILED to connect incoming call to mediaserver: ${err || err.message}`);
      return  ; 
    }
    dlg.on('destroy', () => {
      ep.destroy(); 
      console.log('caller removed from conference');
    }) ;

    // move the endpoint into the conference
    ep.joinConference( conf, (err) => {
      if( err ) {
        console.log('failed to join caller to conference: %s', err) ;
        dlg.destroy() ;
      }
      console.log('joined caller to conference');
    }) ;

  });

}) ;
