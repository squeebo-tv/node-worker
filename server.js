
'use strict'

const bodyParser = require( 'body-parser' ),
  cors     = require( 'cors' ),
  express  = require( 'express' ),
  util = require( 'util' )

const CsvWorker = require( './csv.worker' )
const LastMiddleware = require( './last.middleware' )

const logger = console

class Server{
  constructor() {
    this.express = express()

    this.setupRoutes()
      .then(() => this.setupWorkers())
      .then(() => this.startListening())
      .catch( err => {
        logger.error( `Server start failed: ${err}` )
        throw err
      })
  }


  setupRoutes(){
    return new Promise(( resolve, reject ) => {
      this.express.use(cors())
      this.express.use(bodyParser.json())
      this.express.use(bodyParser.urlencoded({ extended: false }))
      this.express.post( '/csv', ( req, res, next ) => {
        res.app.locals.CsvWorker.postMessage({
          event: 'new-csv',
          from:  'Parent',
          data:  req.body.csv
        })

        res.status( 202 )
          .type( 'json' )
          .send({ status: 'PROCESSING' })
          .end()
      })
      this.express.post( '/ping', ( req, res, next ) => {
        res.app.locals.CsvWorker.postMessage({
          event: 'ping',
          from:  'Parent',
          data:  { counter: req.body.counter } //countdown
        })

        res.status( 200 )
          .type( 'json' )
          .send({ status: 'PINGED' })
          .end()
      })

      this.express.use( LastMiddleware.default, LastMiddleware.error )
      resolve()
    })
  }

  setupWorkers(){
    return this.setupCsvWorker()
  }

  setupCsvWorker(){
    //Note: child doesn't exist yet and will never access this scope
    return new Promise(( resolve, reject ) => {
      this.express.locals.CsvWorker = CsvWorker.threaded()
      this.express.locals.CsvWorker.on( 'message', this.handleCsvWorkerMessage.bind( this ) )
      logger.info( 'Parent: worker started' )

      resolve()
    })
  }

  startListening(){
    return new Promise(( resolve, reject ) => {
      const netServer = this.express.listen( 8080 )
      netServer.on( 'error', err => {
        logger.warn( err )
        reject( err )
      })

      netServer.once( 'listening', () => {
        logger.info( `Listening to *:8080` )
        resolve()
      })
    })
  }

  handleCsvWorkerMessage( msg ){
    logger.debug( `Parent: received ${util.inspect( msg )}\n` )

    if( msg.event == 'csv-complete' ){
      this.handleCsvComplete( msg )
    }
    else if( msg.event == 'pong' ){
      this.handlePong( msg )
    }
    else{
      logger.warn( `Parent: received unsupported event: ${msg.event}\n` )
    }
  }

  handleCsvComplete( msg ){
    logger.info( 'CSV processing is complete!' )
    logger.warn( `${util.inspect( msg.data )}\n` )
  }

  handlePong( msg ){
    logger.info( `Ping received from ${msg.from}, counter = ${msg.data.counter}\n` )

    if( msg.data.counter ){
      const response = {
        event: 'ping',
        from:  'Parent',
        data: { counter: msg.data.counter - 1 }
      }

      //reply to Worker, 3s delay
      setTimeout( () => { this.express.locals.CsvWorker.postMessage( response ) }, 3000 )
    }
    else{
      logger.warn( 'Counter is zero' )
    }
  }
}

new Server()
