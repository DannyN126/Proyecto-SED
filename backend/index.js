const http = require('http')
const { router } = require('./lib/router')
const { indexRoutes } = require('./routes/index.routes')
const { sellerRoutes } = require('./routes/seller.routes')

class Server {
    PORT = process.env.PORT || 5000
    server

    constructor() {
        this.routes()
    }

    routes() {
        router.use('/api', indexRoutes)
        //router.use('/api', sellerRoutes)
    }

    start() {
        this.server = http.createServer((request, response) => {
            router.route(request, response)
        })
        this.server.listen(this.PORT, () => console.log('Servidor corriendo en el puerto ' + this.PORT))
    }
}

const server = new Server()
server.start()
