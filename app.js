const app = require('drachtio')() ;
const Mrf = require('drachtio-fsmrf') ;
const mrf = new Mrf(app) ;
const Srf = require('drachtio-srf') ;
const srf = new Srf(app) ;

srf.connect({
  host: '127.0.0.1',
  port: 9022,
  secret: 'cymru',
}) 
.on('connect', (err, hostport) => { console.log(`connected to drachtio listening on ${hostport}`) ;})
.on('error', (err) => { console.error(`Error connecting to drachtio at ${err || err.message}`) ; }) ;

// connect to the media server, create a conference, and start recording
mrf.connect( {
  address: '127.0.0.1',
  port: 8021,
  secret: 'ClueCon'
}, (ms) => {
  console.log(`connected to media server `);
  // save the media server object as in app locals so it can be retrieved from middleware
  srf.locals.ms = ms ;
  ms.createConference('testconf', (err, conf) => {
    if( err ) {
      throw err ;
    }
    srf.locals.conf = conf ;

    console.log('successfully created conference');
    conf.startRecording('/usr/local/freeswitch/recordings/record.wav', (response) => {
      console.log('response to start recording: %s', JSON.stringify(response));
    });
  }) ;
}) ;


// new callers to the conference
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
    dlg.on('destroy', () => {ep.destroy(); }) ;

    ep.joinConference( conf, (err) => {
      if( err ) {
        console.log('failed to join caller to conference: %s', err) ;
        dlg.destroy() ;
      }
      console.log('joined caller to conference');
    }) ;

  });

}) ;
