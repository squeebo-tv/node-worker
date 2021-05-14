
'use strict'

const EventEmitter   = require( 'events' ),
  util = require( 'util' ),
  worker_threads = require( 'worker_threads' )

const logger = console

class CsvWorker extends EventEmitter{
  constructor(){
    //setup / initialize event listener
    super()

    //listen for messages from Parent
    worker_threads.parentPort.on( 'message', this.handleMessage.bind( this ) )
  }

  async handleMessage( msg ){
    logger.debug( `Worker: received ${util.inspect( msg )}\n` )

    if( msg.event == 'new-csv' ){
      CsvWorker.handleCsv( msg )
    }
    else if( msg.event == 'ping' ){
      CsvWorker.handlePing( msg )
    }
    else{
      logger.warn( `Worker: received unsupported event: ${msg.event}\n` )
    }
  }

  static handleCsv( msg ){
    let pos = 0
    const rows = []
    let eol, keys, line, row, values
    while( true ){
      eol = msg.data.indexOf( '\n', pos )
      if( eol === -1 ){
        line = msg.data.substring( pos )
        pos = msg.data.length //eof
      }
      else{
        line = msg.data.substring( pos, eol )
        pos = eol + 1
      }

      values = line.split( ',' )
      if( !keys ){
        keys = values
      }
      else{
        row = {}
        for( let i = 0; i < keys.length; ++i ){
          row[ keys[i] ] = values[i]
        }
        rows.push( row )
      }

      if( eol === -1 )
        break
    }

    logger.debug( `Worker created ${util.inspect( rows )}\n` )

    const response = {
      event: 'csv-complete',
      from: 'CsvWorker',
      data: rows
    }
    worker_threads.parentPort.postMessage( response )
  }

  static handlePing( msg ){
    logger.info( `Ping received from ${msg.from}, counter = ${msg.data.counter}\n` )

    if( msg.data.counter ){
      const response = {
        event: 'pong',
        from: 'CsvWorker',
        data: { counter: msg.data.counter - 1 }
      }

      //reply to Parent, 3s delay
      setTimeout( () => { worker_threads.parentPort.postMessage( response ) }, 3000 )
    }
    else{
      logger.warn( 'Counter is zero' )
    }
  }

  //ref: https://nodejs.org/api/worker_threads.html#worker_threads_class_worker
  static threaded(){
    //both Parent and Worker (child) will execute __filename
    //See line 100: use `worker_threads.isMainThread` to handle setup
    return new worker_threads.Worker( __filename )
  }
}

if( worker_threads.isMainThread ){
  //Parent code: (none)
}
else{
  //Worker code:
  new CsvWorker()
}

module.exports = CsvWorker
