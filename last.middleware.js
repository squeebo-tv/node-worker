
'use strict'

const logger = console

//ref: https://expressjs.com/en/4x/api.html#app.use
class LastMiddleware{
  static default( req, res, next ){
    logger.warn( 'Unhandled request:' )
    logger.warn( LastMiddleware.getRequest( req ) )
    res.status( 404 ).send({ code: 404, message: 'Not Found' })
  }

  static error( err, req, res, next ){
    logger.warn( LastMiddleware.getRequest( req ) )
    logger.error( err )
    res.status( 500 ).send({ code: 500, message: 'Internal Server Error' })
  }

  static getRequest( request ){
    let req = request.method.toUpperCase() +' '+ request.url

    //TODO: does request.url include params?

    if( Object.keys( request.query ).length ){
      req += '?'+ querystring.stringify( request.query )
    }

    if( Object.keys( request.body ).length ){
      req += "\r\n"+ JSON.stringify( request.body )
    }

    return req
  }
}

module.exports = LastMiddleware
