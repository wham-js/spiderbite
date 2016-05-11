var tap = require('tap')
var sb = require('./')
// check that stuff gets calleda t times i guess?

tap.test('runs for 4 ticks and then stops, playing 4 notes', function (t) {
  t.plan(5)
  var spiderbite = sb({bpm: 1000})
  spiderbite.bind(true, function (data, index, array) {
    t.equal(data, index)
  }, [{
      data: [
        [[0], [1], [2], [3]]
      ],
      probs: [
        [1, 1, 1, 1]
      ],
      nexts: [
        [0]
      ],
      mod: 1,
      current: 0,
      tick: 0,
      lead: true
  }])
  spiderbite.setStructure([[null]])
  spiderbite.onEnd(function () {
    t.ok(true)
  })
  spiderbite.start()
})

tap.test('runs for 4 ticks and then stops, playing 0 notes', function (t) {
  t.plan(1)
  var spiderbite = sb({bpm: 1000})
  spiderbite.bind(true, function (data, index, array) {
    t.equal(data, index)
  }, [{
      data: [
        [[0], [1], [2], [3]]
      ],
      probs: [
        [0, 0, 0, 0]
      ],
      nexts: [
        [0]
      ],
      mod: 1,
      current: 0,
      tick: 0,
      lead: true
  }])
  spiderbite.setStructure([[null]])
  spiderbite.onEnd(function () {
    t.ok(true)
  })
  spiderbite.start()
})