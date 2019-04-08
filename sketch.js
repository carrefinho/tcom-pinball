let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;
Matter.use('matter-collision-events');

let engine, world,
    ballArray = [],
    pinArray = [];
let pinRadius, ballRadius, restitution;

let synths = [], scales;
let root, octave;
let lastChords;

function setup(){
  // intialize canvas
  let canvasSize = floor(constrain(0.7 * Math.min(windowWidth, windowHeight), 0, 960));
  canvas = createCanvas(canvasSize, canvasSize);
  canvas.parent("canvas-container");
  canvas.position((windowWidth - width) / 2, (windowHeight - height) / 2)
  background(255);

  // physics and stuff
  engine = Engine.create();
  world = engine.world;
  Engine.run(engine);

  // initialize and draw pins
  pinArraySize = 6;
  let gridWidth = 0.6 * width;
  let gridHeight = 0.6 * height;
  let margin = (width - gridWidth) / 2;
  let horInterval = gridWidth / (pinArraySize - 1);
  let verInterval = gridHeight / (pinArraySize - 1) / 2;
  pinRadius = 5;
  ballRadius = 18;
  restitution = 0.7;
  let options = {isStatic: true};
  for (let i = 1; i <= pinArraySize * 2 - 1; i++) {
    let numPins;
    if (i <= pinArraySize) {
      numPins = i;
    } else {
      numPins = 2 * pinArraySize - i;
    }
    let numInterval = numPins - 1;
    let initPosX = margin + 0.5 * gridWidth - numInterval * horInterval / 2;
    for (let j = 0; j < numPins; j++) {
      let x = initPosX + j * horInterval;
      let y = margin + (i-1) * verInterval;
      fill(0);
      let currentPin = new pin(x, y, pinRadius, i, j+1)
      pinArray.push(currentPin);
    }
  }

  // initialize synthesizers and scales
  for (let i = 0; i < 3; i++) {
    synths[i] = new Tone.Synth().toMaster();
  }
  scales = {
    major: [0, 2, 4, 5, 7, 9, 11, 12],
  	minor: [0, 2, 3, 5, 7, 8, 10, 12],
  	majorPentatonic: [0, 2, 4, 8, 10, 12],
  	locrian: [0, 1, 3, 5, 6, 8, 10, 12]
  }
  root = 48;
	octave = 0;

  let scale = scales.major;
  let scaleLength = scale.length;

  for (let i = 1; i < scaleLength * 2; i++){
		scale.push(scale[scaleLength - 1] + scale[i]);
	}
	for (let i = 0; i < scale.length; i++){
		scale[i] += root + octave * 12;
	}

  // assign triads to each of the pins
  pinArray.forEach(function(pin){
    let triadRoot = floor(random(7));
    let chord = [scale[triadRoot], scale[triadRoot + 2], scale[triadRoot + 4]]
    pin.setChord(chord);
  })

  // get button and assign function
  let playLast = select("#play-last");
  playLast.position(margin, margin + height + 12);
  playLast.mouseReleased(function(){
    let currentChords = [];
    currentChords[0] = [];
    currentChords[1] = [];
    currentChords[2] = [];

    lastChords.forEach(function(chord){
      currentChords[0].push(new Tone.Frequency(chord[0], "midi"));
      currentChords[1].push(new Tone.Frequency(chord[1], "midi"));
      currentChords[2].push(new Tone.Frequency(chord[2], "midi"));
    });

    Tone.Transport.start();
    let sequencers = []
    for (let i = 0; i < currentChords.length; i++){
      let newSeq = new Tone.Sequence(function(time, note){
    		//console.log(note);
    		synths[i].triggerAttackRelease(note, 0.6);
    	}, currentChords[i], "4n");
      sequencers.push(newSeq);
    }
    sequencers.forEach(function(seq){
      seq.loop = 0;
      seq.start();
    });
  })
}

function draw(){
  background(255);

  push();
  noFill();
  stroke(0);
  strokeWeight(1);
  ellipse(mouseX, 50, ballRadius * 2);
  pop();

  // draw pins
  for (let i = 0; i < pinArray.length; i++){
    pinArray[i].display();
  }

  // draw and update main ball
  for (let i = 0; i < ballArray.length; i++){
    if (ballArray[i].outOfBounds()) {
      ballArray.splice(i, 1);
    } else {
      ballArray[i].display();
    }
  }

}

function mousePressed(){
  // emit a ball
  let newBall = new ball(mouseX, 50, ballRadius);
  ballArray.push(newBall);
}


class ball {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.radius = r;
    this.diameter = this.radius * 2;
    let options = {
      friction: 0.3,
      restitution: restitution
    }
    this.body = Bodies.circle(this.x, this.y, this.radius, options);
    this.chords = [];

    // to access the ball object inside the following callback function
    let self = this;

    // play chord on collision
    this.body.onCollide(function(pair){

      let currentChord = pinArray[pair.bodyA.id - 1].getChord();
      for (let i = 0; i < currentChord.length; i++) {
        let note = new Tone.Frequency(currentChord[i], 'midi');
        synths[i].triggerAttackRelease(note, 0.4);
      }
      self.chords.push(currentChord);
    })
    World.add(world, this.body);
  }

  display(){
    let position = this.body.position;
    fill(0);
    ellipse(position.x, position.y, this.radius * 2);
  }

  outOfBounds(){
    let position = this.body.position;
    if (position.x < 1 || position.x > width - 1 || position.y > height - 1){
      saveLastChords(this.chords);
      World.remove(world, this.body);
      return true;
    } else {
      return false;
    }
  }
}

function saveLastChords(chords){
  if (chords.length > 0){
    lastChords = chords;
  }
}

class pin {
  constructor(x, y, r, row, col) {
    this.x = x;
    this.y = y;
    this.radius = r;
    this.row = row;
    this.col = col;
    let options = {
      isStatic: true,
      friction: 0.3,
      restitution: restitution
    };
    this.body = Bodies.circle(this.x, this.y, this.radius, options);
    World.add(world, this.body)
  }

  display(){
    let position = this.body.position;
    fill(0);
    ellipse(position.x, position.y, this.radius * 2);
    fill('#bbb');
    textSize(8);
    textFont('pf_tempesta_fiveregular');
    text(this.chord, position.x + 12, position.y);
  }

  setChord(chord){
    this.chord = chord;
  }

  getChord(chord){
    return this.chord;
  }

}
