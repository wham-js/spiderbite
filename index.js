module.exports = function (args) {
  args = args || {}
  return {
    bpm: args.bpm || 120,
    advanceMod: args.advanceMod || 1,
    _interval: undefined,
    _counter: 0, // increments each loop
    _tick: 0, // increments each interval/beat
    _current: 0, // which section for each inst (verse, chorus, etc.)
    _nextCurrent: 0, // which section will be played next
    _instruments: [], // the instruments, lol
    _structure: undefined, // how to jump between the larger patterns
    onEnd: undefined, // called when the structure hits a `null`
    onSectionStart: undefined, // called when a pattern begins, passed a boolean that designates whether or not the section will update at the end of the current one
    comparator: function (random, prob) { // called to see if an instrument should be played, can be overwritten
      return random < prob
    },
    _roll: function (prob) {
      return this.comparator(Math.random(), prob)
    },
    start: function () {
      // make a list, check it twice,
      if (!this._instruments.length) throw new YouGotBitError('no data is bound')
      if (!this._structure) throw new YouGotBitError('no structure is bound')
      if (this._interval) throw new YouGotBitError('oops u tried to start another loop, way to go Steve Reich smdh')
      if (!this._instruments.some(instrument => instrument.lead)) throw new YouGotBitError('a lead instrument must be bound')

      // make the lead instrument be last, to simplify advancing the sequence later
      this._instruments.sort((a, b) => a.lead ? 1 : (b.lead ? -1 : 0))

      this._interval = setInterval(() => {

        this._instruments.forEach(instrument => {

          // grab the current section for this instrument (verse, chorus, etc.)
          var section = instrument.data[this._current]

          // if the section has a modulus value, see if this is it is on beat
          // i.e, mod 1: every beat, mod 2: every other beat
          // useful for creating breakdowns and bass drops
          var modulus = (section.config.mod || 1)
          var onItsBeat = this._tick % modulus === 0
          // also check if the instrument will play on the next turn, otherwise we will end patterns too soon
          var willPlayOnNextBeat = (this._tick + 1) % modulus === 0

          var willAdvanceOnNextBeat = (this._counter + 1) % this.advanceMod === 0

          if (instrument.lead && onItsBeat && section._tick === 0) {
            if (willAdvanceOnNextBeat) this._nextCurrent = pick(this._structure[this._current])
            if (this.onSectionStart) this.onSectionStart(this._current !== this._nextCurrent)
          }

          // if the section has a fill, and the pattern is gonna change next turn
          if (onItsBeat && section.fill && (this._current !== this._nextCurrent)) {
             // if the instrument is on it's beat, and wins the dice roll, play the fill
            if (onItsBeat && this._roll(section.fill.probs[section._tick])) {
              // play the FILLLLLLLLLL for that instrument, passing along a randomly chosen data  for that beat, along with the entire section object
              instrument.play(pick(section.fill.data[section._tick]), section)
            }
          // if the instrument is on it's beat, and wins the dice roll
          } else if (onItsBeat && this._roll(section.probs[section._current][section._tick])) {

            // play the instrument, passing along a randomly chosen data  for that beat, along with the entire section object
            instrument.play(pick(section.data[section._current][section._tick]), section)
          }

          // advance the counter for this section
          if (onItsBeat) section._tick++

          // if we are at the end of a section AND this instrument will play on the next beat
          if (section._tick === section.probs[section._current].length && willPlayOnNextBeat) {

            // reset the counter for this section
            section._tick = 0

            // pick a new pattern to play
            section._current = pick(section.nexts[section._current])

            // if the instrument is the lead
            if (instrument.lead) {
              this._counter++ // advance the loop counter

              // if we have played the loop some number of increments of the advanceModulus...
              if (this._counter % this.advanceMod === 0) {
                // ... pick a new section to play
                this._current = this._nextCurrent
              }

              // if the new section is null or some other junk
              if (typeof this._current !== 'number') {
                // the end of the song! erm, what to do here?
                // might want to be able to attach an onEnd callback thing
                // especially for mediaRecorder...
                this.stop()
                if (this.onEnd) this.onEnd()
              }
            }
          }
        })

        // advance the global counter
        this._tick++
      }, 60000.0 / this.bpm)
    },

    stop: function () {
      clearInterval(this._interval)
      this._interval = null
    },

    bind: function (lead, cb, data) {

      // if this instrument is labelled a "lead" but we already have a lead, that's a boo-boo
      if (lead && this._instruments.some(instrument => instrument.lead)) throw new YouGotBitError('a lead instrument is already bound')

      // check to see that every existing instrument in the sequencer...
      if (this._instruments.length) {

        // has the same number of larger patterns as the data being added...
        if (this._instruments.some(inst => inst.data.length !== data.length)) throw new YouGotBitError('data does not match existing data')
      }

      // if there is a structure bound, ...
      if (this._structure) {

        // ... check to see that it has as many patterns as there are in the bound data
        if (this._structure.length !== data.length) throw new YouGotBitError('data does not match existing structure')
      }

      // check that the data is valid, note/prob/next-wise
      var itIsGood = data.every((pattern) => {
        if (!(pattern.data.length === pattern.probs.length && pattern.data.length === pattern.nexts.length)) {
          throw new YouGotBitError('data/probs/nexts external mismatch')
        }
        if (pattern.nexts.some(i => i >= pattern.probs.length || i < 0)) {
          throw new YouGotBitError('nexts points to non-existent pattern')
        }
        return pattern.probs.every((loop, i) => {
          return loop.length === pattern.data[i].length
        })
      })

      if (!itIsGood) throw new YouGotBitError('data/probs internal mismatch')

      // add internal counter things to the bound data
      data = data.map(pattern => {
        pattern._current = 0
        pattern._tick = 0
        return pattern
      })

      // if we have made it this far, push forward!
      this._instruments.push({data: data, play: cb, lead: lead})
    },

    setStructure: function (data) {
      if (this._instruments.length) {
        if (this._instruments[0].data.length !== data.length) throw new YouGotBitError('structure does not match existing data')
      }
      this._structure = data
    }
  }
}

function pick (arr) {
  return arr[~~(Math.random() * arr.length)]
}

function YouGotBitError (msg) {
  this.name = 'YouGotBitError'
  this.message = msg
}

YouGotBitError.prototype = new Error()
YouGotBitError.prototype.constructor = YouGotBitError
