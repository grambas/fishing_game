// var custom = new ProgressBar.Path('#custom', {
//   easing: 'easeInOut',
//   duration: 2000
// });
//
// custom.set(0);
// custom.animate(1.0);

class Game {
    constructor(fishSize) {
        this.state = 'inactive'
        this.config = {
            timeToHook: 1070000,
            minWait: 1000,
            maxWait: 5000,
            minPull: 200,
            maxPull: 800,
        }
        this.waitTime = this.calculateWaitTime(fishSize)
        this.pullTime = this.calculatePullTime(fishSize)
        this.maxGameTime = this.waitTime + this.pullTime + 3000
    }

    get getState() {
        return this.state;
    }

    set setState(state) {
        console.log('state changed: ' + this.state + ' -> ' + state)
        this.state = state;
    }

    calculateWaitTime(fishSize) {
        // todo consider fishSize
        return Math.floor(Math.random() * (this.config.maxWait - this.config.minWait + 1)) + this.config.minWait;
    }

    calculatePullTime(fishSize) {
        // todo consider fishSize
        return Math.floor(Math.random() * (this.config.maxPull - this.config.minPull + 1)) + this.config.minPull;
    }

    calculateMaxGameTime(fishSize) {
        // todo consider fishSize
        return Math.floor(Math.random() * (this.config.maxPull - this.config.minPull + 1)) + this.config.minPull;
    }
}

const quadrat = new Game(10, 10);

console.log(quadrat.flaeche);


let startingTime
let totalElapsedTime
let elapsedTimeSinceHooking
let timePressed = 0
let currentSize = 0
let press = false

var circle = new ProgressBar.Circle('#circle', {
    strokeWidth: 8,
    easing: 'easeInOut',
    // duration: 1400,
    trailWidth: 0,
    color: 'var(--green)',
    // trailColor: 'rgba(255,255,255,0)',
    svgStyle: null,
    text: {
        value:''
    }
});

let game = {
    state: 'inactive',
    waitTime: 0,
    pullTime: 0,
    maxGameTime: 0,
    config: {
        timeToHook: 800,
        minWait: 1000,
        maxWait: 5000,
        minPull: 200,
        maxPull: 800,
    }
}
// declare game dom elements
let container = document.querySelector("#container")
let itemContainer = document.querySelector("#itemContainer")
let iconContainer = document.querySelector("#iconContainer")
let dragItem = document.querySelector("#item")
let fishIcon = document.querySelector("#fishIcon")
let lostIcon = document.querySelector("#lostIcon")
let okIcon = document.querySelector("#okIcon")

// declare debug dom elements
let debugTotalTime = document.querySelector("#totalTime");
let debugMaxGameTime = document.querySelector("#maxGameTime");
let debugCurrentTension = document.querySelector("#currentTension");
let debugCurrentState = document.querySelector("#currentState");
let debugPullNeeded = document.querySelector("#pullNeeded");
let debugWaitTime = document.querySelector("#waitTime");


// listen mouse events
container.addEventListener("mousedown", pressingDown, false);
container.addEventListener("mouseup", notPressingDown, false);
container.addEventListener("touchstart", pressingDown, false);
container.addEventListener("touchend", notPressingDown, false);

async function ticker(currentTime) {
    updateDebug()

    if (game.state === 'inactive') {
        reset()
        return
    }

    if (game.state === 'lost') {
        return
    }

    // pressed in waiting state
    if (game.waitTime < totalElapsedTime && game.state === 'waiting') {
        console.log('// pressed in waiting state', game.waitTime, totalElapsedTime);

        setGameHooking()
    }

    if (elapsedTimeSinceHooking + game.config.timeToHook < totalElapsedTime && game.state === 'hooking') {
        setGameLost('missed hook')
        return
    }

    // pressed in waiting state
    if (game.pullTime < timePressed && game.state === 'pulling') {
        setGameWin()
        return
    }

    if (press) {
        timePressed++;
        currentSize++;

        if (game.state === 'waiting') {
            setGameLost('mouse pressed in waiting state')
            return
        }

        // pressed in waiting state
        if (game.state === 'waiting') {
            setGameLost('mouse pressed not in waiting state')
            return
        }

        // pressed in waiting state
        if (game.state === 'hooking') {
            await setGamePulling()
        }

        circle.set(normalizeCurrentPull())
        scaleItem();
    } else {
        // timePressed = 0;
    }

    if(!startingTime) {
        startingTime = currentTime
    }

    totalElapsedTime = currentTime - startingTime

    requestAnimationFrame(ticker);
}

// ticker(0);

function pressingDown(e) {
    e.preventDefault();
    if (e.button !== 0) {
        return;
    }

    press = true;
}

function notPressingDown(e) {
    e.preventDefault();

    if (e.button !== 0) {
        return;
    }

    press = false;
    resetItem();
}

function scaleItem() {
    let size = 1 + currentSize / 500;

    if (size > 1.5) {
        size = 1.5;
    }

    pullingCss(size)
    // dragItem.style.transitionDuration = "0s";
    // dragItem.style.setProperty("--scale-value", size);
}

function resetItem() {
    console.log('reset item')
    // dragItem.style.transitionDuration = ".2s"
    // dragItem.style.setProperty("--scale-value", 1)
    itemContainer.classList.remove("shake-constant")
    itemContainer.classList.remove("shake-slow")
    itemContainer.classList.remove("shake-little")
    currentSize = 0

    // dragItem.classList.remove("border-green")
    // dragItem.classList.remove("border-yellow")
    // dragItem.classList.remove("border-red")
}

function reset()
{
    itemContainer.style.display = "none";
    hookingCss(false)
    waitingCss(false)
    pullingCss(0, false)

    timePressed = 0
    elapsedTimeSinceHooking = 0
    timePressed = 0
    totalElapsedTime = 0
    startingTime = 0

    setState('inactive')
}


function startGame()
{
    reset()
    itemContainer.style.display = "block";

    let newGame = new Game(1);
    console.log('game', newGame);
    game.waitTime = Math.floor(Math.random() * (game.config.maxWait - game.config.minWait + 1)) + game.config.minWait;
    game.pullTime = Math.floor(Math.random() * (game.config.maxPull - game.config.minPull + 1)) + game.config.minPull;
    game.maxGameTime = game.waitTime + game.pullTime + 2000

    setState('waiting')
    waitingCss()
    ticker(0);
}


function setGameHooking()
{
    waitingCss(false)
    hookingCss()
    setState('hooking')

    elapsedTimeSinceHooking = totalElapsedTime
}

async function setGamePulling()
{
    circle.set(0)
    circle.animate(1.0, {duration: 500})
    await sleep(500);
    hookingCss(false)
    circle.set(0)
    setState('pulling')
}


async function setGameLost(reason)
{
    console.log('game lost: ', reason)

    iconContainer.classList.remove("hook-icon")
    dragItem.classList.remove("border-green")
    dragItem.classList.remove("border-yellow")
    dragItem.classList.remove("pulsing")
    dragItem.classList.add("border-red")

    fishIcon.style.display = "none";

    dragItem.classList.add("border-red")
    lostIcon.style.display = "inline-block";

    circle.animate(0.0, {duration: 700})
    await sleep(700);

    lostIcon.style.display = "none";
    dragItem.classList.remove("border-red")

    setState('lost')
    reset()
}

async function setGameWin()
{
    dragItem.classList.remove("pulsing")
    dragItem.classList.remove("border-green")
    dragItem.classList.remove("border-yellow")
    dragItem.classList.remove("pulsing")
    dragItem.classList.remove("border-red")

    fishIcon.style.display = "none";
    lostIcon.style.display = "none";

    okIcon.style.display = "inline-block";

    circle.animate(0.0, {duration: 700})
    await sleep(700);

    okIcon.style.display = "none";

    setState('win')
    reset()
}

function waitingCss(activate = true)
{
    if (activate) {
        dragItem.classList.add("pulsing");
    } else {
        dragItem.classList.remove("pulsing");
    }
}

function hookingCss(activate = true)
{
    if (activate) {
        dragItem.classList.add("pulsing-red")
        iconContainer.classList.add("shake-constant")
        iconContainer.classList.add("shake-little")
        iconContainer.classList.add("hook-icon")
    } else {
        dragItem.classList.remove("pulsing-red")
        iconContainer.classList.remove("shake-constant")
        iconContainer.classList.remove("shake-little")
        iconContainer.classList.remove("hook-icon")

    }
}

function pullingCss(size, activate = true)
{
    if (activate) {
        console.log('current size', size);

        fishIcon.style.display = "inline-block";

        if (size < 1.2) {
            // dragItem.classList.add("border-green")
            dragItem.classList.remove("border-yellow")
            dragItem.classList.remove("border-red")
        } else if (size >= 1.2 && size <= 1.3) {
            dragItem.classList.remove("border-green")
            dragItem.classList.add("border-yellow")
            dragItem.classList.remove("border-red")

            itemContainer.classList.remove("shake-slow")
            itemContainer.classList.add("shake-little")
            itemContainer.classList.add("shake-constant")
        } else if (size > 1.3 && size < 1.5) {
            dragItem.classList.remove("border-green")
            dragItem.classList.remove("border-yellow")
            dragItem.classList.add("border-red")
            itemContainer.classList.remove("shake-little")
            itemContainer.classList.add("shake-constant")
            itemContainer.classList.add("shake-slow")
        }
    } else {
        dragItem.classList.remove("border-green")
        dragItem.classList.remove("border-yellow")
        dragItem.classList.remove("border-red")
        itemContainer.classList.remove("shake-little")
        itemContainer.classList.remove("shake-constant")
        itemContainer.classList.remove("shake-slow")

        fishIcon.style.display = "none";
    }
}

function setState(state)
{
    console.log('state changed: ' + game.state + ' -> ' + state)
    game.state = state
}

/**
 *  HELP FUNCTIONS
 */

function updateDebug()
{
    debugCurrentState.textContent = 'Game State: ' + game.state;
    debugTotalTime.textContent = 'TotalElapsedTime: ' + Math.round(totalElapsedTime) + ' ms';
    debugMaxGameTime.textContent = 'Max Game time : ' + game.maxGameTime + ' ms';
    debugWaitTime.textContent = 'Wait Time: ' +  game.waitTime + ' ms';
    debugPullNeeded.textContent = 'Pull time needed: ' +  game.pullTime;
    debugCurrentTension.textContent = 'Current pull time: ' +  timePressed +' (' + Math.round(normalizeCurrentPull() * 100) + '%)';
    // circle.setText(game.state)
}

/**
 *  normalized current pull value in 0-1 range with 4 decimals
 *
 * @returns {string|number}
 */
function normalizeCurrentPull() {
    if (timePressed === 0 || game.pullTime === 0) {
        return 0
    }

    return  (timePressed / game.pullTime).toFixed(4)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
