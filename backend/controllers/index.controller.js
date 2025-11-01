class IndexController {
    async getIndex(req, res) {
        console.log(req.params.id, req.query.user, req.body)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ msg: 'Bienvenido al index GET' }))
    }

    async postIndex(req, res) {
        console.log(req.params.id, req.query.user, req.body.cuerpo)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ msg: 'Bienvenido al index POST' }))
    }
}

const indexController = new IndexController()
module.exports = { indexController }