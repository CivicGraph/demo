'use strict'

const jiff = require('jiff')
const popper = require('cytoscape-popper')
const cytoscape = require('cytoscape')

cytoscape.use(popper)

if (!window.jiff) {
  window.jiff = jiff
  window.cytoscape = cytoscape
}