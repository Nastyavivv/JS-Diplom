`use strict`;

class Vector {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	plus(nextVector) {
		if (!(nextVector instanceof Vector)) {
			throw Error('Можно прибавлять к вектору только вектор типа Vector');
		}
		return new Vector(this.x + nextVector.x, this.y + nextVector.y);
	}

	times(k) {
		return new Vector(this.x * k, this.y * k);
	}
}

class Actor {
	constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
		if (!(pos instanceof Vector && size instanceof Vector && speed instanceof Vector)) {
			throw Error('Позиция, размер и скорость задаются только объектом типа Vector');
		}
		this.pos = pos;
		this.size = size;
		this.speed = speed;
	}


	get left() {
		return this.pos.x;
	}

	get right() {
		return this.pos.x + this.size.x;
	}

	get top() {
		return this.pos.y;
	}

	get bottom() {
		return this.pos.y + this.size.y;
	}

	get type() {
		return 'actor';
	}

	act() {}

	isIntersect(nextActor) {
		if (nextActor === undefined) {
			throw Error('Нужно указать объект типа Actor');
		}
		if (!(nextActor instanceof Actor)) {
			throw Error('Нужно указать объект типа Actor');
		}
		if (nextActor === this) {
			return false;
		}

		return (
			((this.right > nextActor.left) && (this.left < nextActor.right)) &&
			((this.bottom > nextActor.top) && (this.top < nextActor.bottom))
		);
	}
}


class Level {
	constructor(grid = [], actors = []) {
		this.grid = grid;
		this.actors = actors;
		this.player = this.actors.find(function (actor) {
			return actor.type === 'player';
		});
		this.height = grid.length;
		this.width = grid.reduce(function (memo, el) {
			if (el.length > memo) {
				memo = el.length;
				return memo;
			}
			return memo;
		}, 0);
		this.status = null;
		this.finishDelay = 1;
	}
	isFinished() {
		return (this.status !== null && this.finishDelay < 0);
	}

	actorAt(actor) {
		if (actor === undefined) {
			throw Error('Нужно указать объект типа Actor');
		}
		if (!(actor instanceof Actor)) {
			throw Error('Нужно указать объект типа Actor');
		}
		return this.actors.find(function (el) {
			return actor.isIntersect(el);
		});
	}

	obstacleAt(toPos, size) {
		if (!toPos instanceof Vector || !size instanceof Vector) {
			throw Error('Нужно указать объект типа Vector');
		}

		if ((toPos.x < 0) || (toPos.y < 0) || ((toPos.x + size.x) > this.width)) {
			return 'wall';
		}

		if ((toPos.y + size.y) > this.height) {
			return 'lava';
		}

		for (let yIndex = 0; yIndex < this.grid.length; ++yIndex) {
			for (let xIndex = 0; xIndex < this.grid[yIndex].length; ++xIndex) {

				let obstacleType = this.grid[yIndex][xIndex];
				let obstacleActor = new Actor(new Vector(xIndex, yIndex));
				let player = new Actor(toPos, size);
				let result = player.isIntersect(obstacleActor);
				if (result && (obstacleType === 'wall' || obstacleType === 'lava')) {
					return obstacleType;
				}
			}
		}
	}

	removeActor(actor) {
		let index = this.actors.findIndex(function (el) {
			return (el.pos === actor.pos && el.size === actor.size);
		});
		this.actors.splice(index, 1);
	}

	noMoreActors(actorsType) {
		return !this.actors.some(function (el) {
			return el.type === actorsType;
		});
	}

	playerTouched(objType, actor) {
		if (this.status !== null) {} else {

			if (objType === 'lava' || objType === 'fireball') {
				this.status = 'lost';
			} else if (objType === 'coin') {
				this.removeActor(actor);
				if (this.noMoreActors('coin')) {
					this.status = 'won';
				}
			}
		}
	}
}


class LevelParser {
	constructor(book = {}) {
		this.book = book;
	}

	actorFromSymbol(symbSrting) {
		return this.book[symbSrting];
	}

	obstacleFromSymbol(symbSrting) {
		switch (symbSrting) {
			case 'x':
				return 'wall';
				break;
			case '!':
				return 'lava';
		}
	}

	createGrid(schema) {
		let memo = [];
		schema.forEach((schemaEl) => memo.push(schemaEl.split('').map(el => this.obstacleFromSymbol(el))));
		return memo;
	}

	createActors(schema) {
		let indexY;
		let indexX;
		let actors = [];

		for (let y = 0; y < schema.length; ++y) {
			indexY = y;
			let symbolsArray = schema[y].split('');
			for (let x = 0; x < symbolsArray.length; ++x) {
				indexX = x;
				let symbSrting = symbolsArray[x];
				let prot = Actor.prototype;
				let actorConstructor = this.actorFromSymbol(symbSrting);

				let actorVector = new Vector(indexX, indexY);
				if (
					((typeof actorConstructor) === 'function') &&
					((actorConstructor === Actor) || (Actor.prototype.isPrototypeOf(actorConstructor.prototype)))
				) {
					let resultActor = new(actorConstructor)(actorVector);
					actors.push(resultActor);
				}
			}
		}
		return actors;
	}

	parse(schema) {
		let grid = this.createGrid(schema);
		let actors = this.createActors(schema);
		return (new Level(grid, actors));
	}
}


class Player extends Actor {
	constructor(coords) {
		super(coords, new Vector(1, 1), new Vector(0, 0));
		this.pos = this.pos.plus(new Vector(0, -0.5));
	}

	get type() {
		return 'player';
	}
}


class Fireball extends Actor {
	constructor(pos = new Vector(0, 0), speed = new Vector(1, 0)) {
		super(pos, new Vector(1, 0.5), speed);
	}

	get type() {
		return 'fireball';
	}

	getNextPosition(time = 1) {
		let nextVector = new Vector(this.pos.x, this.pos.y);
		nextVector.x += (this.speed.x * time);
		nextVector.y += (this.speed.y * time);
		return nextVector;
	}

	handleObstacle() {
		this.speed.x = this.speed.x * -1;
		this.speed.y = this.speed.y * -1;
	}

	act(time, level) {
		let nextPos = this.getNextPosition(time);
		let obstacleThere = level.obstacleAt(nextPos, this.size);
		if (obstacleThere === 'wall' || obstacleThere === 'lava') {
			this.handleObstacle();
		} else {
			this.pos = nextPos;
		}
	}
}


class HorizontalFireball extends Fireball {
	constructor(pos) {
		super(pos, new Vector(1, 0));
	}
}

class VerticalFireball extends Fireball {
	constructor(pos) {
		super(pos, new Vector(1, 2));
	}
}

class FireRain extends Fireball {
	constructor(pos) {
		super(pos, new Vector(3, 3));
		this.initialPos = this.pos;
	}

	handleObstacle() {
		this.pos = this.initialPos;
	}
}

class Coin extends Actor {
	constructor(pos) {
		super(pos, new Vector(0.7, 0.5));
		this.pos = this.pos.plus(new Vector(0.1, 0.1))
		this.initialPos = this.pos;
		this.springSpeed= 6;
		this.springDist = 0.07;
		this.spring = Math.random() * 2 * Math.PI;
	}

	get type() {
		return 'coin';
	}

	updateSpring(time = 1) {
		this.spring += (this.springSpeed * time);
	}

	getSpringVector() {
		return new Vector(0, (Math.sin(this.spring) * this.springDist));
	}

	getNextPosition(time = 1) {
		this.updateSpring(time);
		if (this.initialPos !== undefined) {
			return this.initialPos.plus(this.getSpringVector());
		}
	}

	act(time = 1) {
		this.pos = this.getNextPosition(time);
	}
}

function loadSchemas() {
	return new Promise(function (resolve, reject) {

		let schemasArray = [

			[
				"   v                   ",
				"                       ",
				"                       ",
				"                       ",
				"                       ",
				"  |                    ",
				"  o                 o  ",
				"  x               = x  ",
				"  x          o o    x  ",
				"  x  @       xxxxx  x  ",
				"  xxxxx             x  ",
				"      x!!!!!!!!!!!!!x  ",
				"      xxxxxxxxxxxxxxx  ",
				"                       "
			],
			[
				"        |           |  ",
				"                       ",
				"                       ",
				"                       ",
				"                       ",
				"                       ",
				"                       ",
				"                       ",
				"                       ",
				"     |                 ",
				"                       ",
				"         =      |      ",
				" @ |  o            o   ",
				"xxxxxxxxx!!!!!!!xxxxxxx",
				"                       "
			],
		];
		resolve(JSON.stringify(schemasArray));
	});
}

const actorDict = {
	'@': Player,
	'o': Coin,
	'v': FireRain,
	'=': HorizontalFireball,
	'|': VerticalFireball
}
const parser = new LevelParser(actorDict);

loadSchemas()
	.then(JSONString => JSON.parse(JSONString))
	.then(schemas => runGame(schemas, parser, DOMDisplay))
	.then(() => alert('Вы выиграли приз!'))
	.catch(err => console.log(err));'use strict';
