BASE_URL = 'http://localhost:8529/_db/evstore/evstore'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjEuNTY5Mzk5Mzk4MTM5NzQ1ZSs2LCJleHAiOjE1NzE5OTEzOTgsImlzcyI6ImFyYW5nb2RiIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZXZzdG9yZSJ9.XlPGNQ8Zpn8LP8vI1tNL_KiOVNq5TV6WpuRv6lP3_QY=';

(function ($) {
  $.when('ready').then(() => {
    window.feather.replace()

    const cy = window.cy = cytoscape({
      container: $('#cy'), // container to render in

      style: [ // the stylesheet for the graph
        {
          selector: 'node',
          style   : {
            'background-color': '#666',
            'label'           : 'data(label)',
            'text-valign'     : 'center',
            'text-halign'     : 'left'
          }
        },
        {
          selector: 'node:selected',
          style   : {
            'background-color': '#007bff'
          }
        },
        {
          selector: 'edge',
          style   : {
            'width'             : 2,
            'line-color'        : '#ccc',
            'label'             : 'data(label)',
            'text-rotation'     : 'autorotate',
            'text-margin-y'     : '-10px',
            'curve-style'       : 'bezier',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'vee'
          }
        },
        {
          selector: 'edge:selected',
          style   : {
            'line-color'        : '#007bff',
            'target-arrow-color': '#007bff'
          }
        }
      ],

      // initial viewport state:
      zoom: 1,
      pan : { x: 0, y: 0 },

      // interaction options:
      minZoom            : 1e-50,
      maxZoom            : 1e50,
      zoomingEnabled     : true,
      userZoomingEnabled : true,
      panningEnabled     : true,
      userPanningEnabled : true,
      boxSelectionEnabled: true,
      selectionType      : 'single',
      touchTapThreshold  : 8,
      desktopTapThreshold: 4,
      autolock           : false,
      autoungrabify      : false,
      autounselectify    : false,

      // rendering options:
      headless            : false,
      styleEnabled        : true,
      hideEdgesOnViewport : false,
      hideLabelsOnViewport: false,
      textureOnViewport   : false,
      motionBlur          : false,
      motionBlurOpacity   : 0.2,
      wheelSensitivity    : 0.05,
      pixelRatio          : 'auto'
    })

    initBindings()
    reset(false)
  })
})(jQuery)

function draw (randomize = false) {
  cy.reset()

  const options = {
    name: 'cose',

    // Called on `layoutready`
    ready: function () {},

    // Called on `layoutstop`
    stop: function () {},

    // Whether to animate while running the layout
    // true : Animate continuously as the layout is running
    // false : Just show the end result
    // 'end' : Animate with the end result, from the initial positions to the end positions
    animate: 'end',

    // Easing of the animation for animate:'end'
    animationEasing: undefined,

    // The duration of the animation for animate:'end'
    animationDuration: undefined,

    // A function that determines whether the node should be animated
    // All nodes animated by default on animate enabled
    // Non-animated nodes are positioned immediately when the layout starts
    animateFilter: function (node, i) { return true },

    // The layout animates only after this many milliseconds for animate:true
    // (prevents flashing on fast runs)
    animationThreshold: 250,

    // Number of iterations between consecutive screen positions update
    refresh: 20,

    // Whether to fit the network view after when done
    fit: true,

    // Padding on fit
    padding: 30,

    // Constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
    boundingBox: undefined,

    // Excludes the label when calculating node bounding boxes for the layout algorithm
    nodeDimensionsIncludeLabels: true,

    // Randomize the initial positions of the nodes (true) or use existing positions (false)
    randomize,

    // Extra spacing between components in non-compound graphs
    componentSpacing: 40,

    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: function (node) { return 2048 },

    // Node repulsion (overlapping) multiplier
    nodeOverlap: 4,

    // Ideal edge (non nested) length
    idealEdgeLength: function (edge) { return 32 },

    // Divisor to compute edge forces
    edgeElasticity: function (edge) { return 32 },

    // Nesting factor (multiplier) to compute ideal edge length for nested edges
    nestingFactor: 1.2,

    // Gravity force (constant)
    gravity: 1,

    // Maximum number of iterations to perform
    numIter: 1000,

    // Initial temperature (maximum node displacement)
    initialTemp: 1000,

    // Cooling factor (how the temperature is reduced between consecutive iterations
    coolingFactor: 0.99,

    // Lower temperature threshold (below this point the layout will end)
    minTemp: 1.0
  }

  const layout = cy.layout(options)
  layout.run()
}

function escapeHtml (unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function initBindings () {
  $('#reset').click(reset)
  $('#redraw').click(draw)
  // $(window).resize(() => setTimeout(draw, 100))

  cy.on('resize', draw)
  cy.on('select', (event) => {
    const el = event.target
    console.log(el.data())
    const idCss = el.id().replace(/\//g, '_')

    const popper = el.popper({
      content: () => {
        const data = el.data()
        const content = escapeHtml(JSON.stringify(data, null, 2))
        const div = $(`
          <div id="${idCss}" class="card" style="width: 18rem;">
            <div class="card-body">
              <h5 class="card-title">Label: ${data.label}</h5>
              <h6 class="card-subtitle mb-2 text-muted">Group: ${el.group()}</h6>
              <p class="card-text"><pre><code>${content}</code></pre></p>
              <a href="#" class="card-link btn btn-primary" data-op="edit"><i data-feather="edit"></i> Edit</a>
              <a href="#" class="card-link btn btn-danger" data-op="delete"><i data-feather="trash-2"></i> Delete</a>
            </div>
          </div>
        `)

        $('body').append(div)
        window.feather.replace()

        $(`#${idCss} a.card-link`).click(e => {
          e.preventDefault()
          const op = $(e.target).attr('data-op')
          switch (op) {
            case 'edit':
              break
            case 'delete':
              if (el.isNode() && el.connectedEdges().size()) {
                alert('This node has connected edges. Delete them first.')
              } else if (confirm('Are you sure you want to delete this element?')) {
                const collection = el.id().split('/')[0]
                remove(collection, data).then(cy.remove(el))
              }
          }
        })

        return div
      }
    })

    const update = () => popper.scheduleUpdate()
    const destroy = () => {
      popper.destroy()
      $(`#${idCss}`).remove()
    }

    el.on('position', update)
    el.on('remove unselect', destroy)
    cy.on('pan zoom resize', update)
  })
}

function reset (doConfirm = true) {
  const confirmed = !doConfirm || confirm('Are you sure? You will lose all your changes!')

  if (confirmed) {
    initData().then(() => show())
  }
}

function initData () {
  window.SESSION_ID = uuidv4()
  const vertices = [
    {
      _key : `${SESSION_ID}_v1`,
      num  : 1,
      label: 'v1',
      obj  : {
        a: 1,
        b: 2
      },
      arr  : [1, 2, 3]
    },
    {
      _key : `${SESSION_ID}_v2`,
      num  : 2,
      label: 'v2',
      obj  : {
        a: 3,
        b: 4
      },
      arr  : [4, 5, 6]
    },
    {
      _key : `${SESSION_ID}_v3`,
      num  : 3,
      label: 'v3',
      obj  : {
        a: 5,
        b: 6
      },
      arr  : [7, 8, 9]
    }
  ]
  const edges = [
    {
      _key : `${SESSION_ID}_e1`,
      _from: `evstore_test_vertex/${vertices[0]._key}`,
      _to  : `evstore_test_vertex/${vertices[1]._key}`,
      num  : 4,
      label: 'e1',
      obj  : {
        a: 7,
        b: 8
      },
      arr  : [10, 11, 12]
    },
    {
      _key : `${SESSION_ID}_e2`,
      _from: `evstore_test_vertex/${vertices[0]._key}`,
      _to  : `evstore_test_vertex/${vertices[2]._key}`,
      num  : 5,
      label: 'e2',
      obj  : {
        a: 9,
        b: 10
      },
      arr  : [13, 14, 15]
    },
    {
      _key : `${SESSION_ID}_e3`,
      _from: `evstore_test_vertex/${vertices[2]._key}`,
      _to  : `evstore_test_vertex/${vertices[0]._key}`,
      num  : 6,
      label: 'e3',
      obj  : {
        a: 11,
        b: 12
      },
      arr  : [16, 17, 18]
    }
  ]

  return insert('evstore_test_vertex', vertices)
    .then(() => insert('evstore_test_edge', edges))
}

function cg2cy (data) {
  console.log(data)
  const typeMap = {
    vertex: 'nodes',
    edge  : 'edges'
  }
  const fieldMap = {
    _id  : 'id',
    _from: 'source',
    _to  : 'target'
  }

  const result = {}

  for (let el of data) {
    const key = typeMap[el.type]
    result[key] = []
    for (let node of el.nodes) {
      const item = {}
      for (let k in node) {
        item[fieldMap[k] || k] = node[k]
      }
      result[key].push({ data: item })
    }
  }
  console.log(result)

  return result
}

function uuidv4 () { //Courtesy: https://stackoverflow.com/a/2117523/3598131
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = (c === 'x') ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function insert (collection, data) {
  const url = [BASE_URL, 'document', collection].join('/')

  return $.ajax({
    url,
    method     : 'POST',
    contentType: 'application/json',
    headers    : {
      accepts       : 'application/json',
      Authorization : `bearer ${TOKEN}`,
      'X-Session-Id': SESSION_ID
    },
    data       : JSON.stringify(data)
  }).then(data => {
    console.log(data)
    return data
  })
}

function remove (collection, data) {
  const url = [BASE_URL, 'document', collection].join('/')

  return $.ajax({
    url,
    method     : 'DELETE',
    contentType: 'application/json',
    headers    : {
      accepts       : 'application/json',
      Authorization : `bearer ${TOKEN}`,
      'X-Session-Id': SESSION_ID
    },
    data       : JSON.stringify(data)
  }).then(data => {
    console.log(data)
    return data
  })
}

function show (path) {
  path = path || `/ng/*/${window.SESSION_ID}_*`
  const url = [BASE_URL, 'event', 'show'].join('/')

  $.ajax({
    url,
    headers: {
      accepts       : 'application/json',
      Authorization : `bearer ${TOKEN}`,
      'X-Session-Id': SESSION_ID
    },
    data   : {
      path,
      groupBy: 'type'
    }
  }).then(data => {
    console.log(data)
    return data
  }).then(cg2cy).then(data => {
    cy.elements().remove()
    cy.add(data)
    draw(true)
  })
}