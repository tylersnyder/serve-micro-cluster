const { send } = require('micro')

module.exports = (req, res) => {
  send(res, 200, {
    status: 'success',
    message: 'endpoint number one'
  })
}