let then, startedAt, elapsed, startingTime, totalElapsedTime, elapsedTimeSinceHooking
let isMousePressed = false
let inDanger = false

const fps = 30

class Game {
    constructor(fishSize) {
        this.engine = {
            frameCount: 0,
            fpsInterval: 1000 / fps,
        }
        this.status = {
            progress: 0,
            resistProgress: 0,
        }
        this.const = {
            minWait: 1000, // min time for player to wait till fish is hooked
            maxWait: 5000, // max time for player to wait till fish is hooked
            minPull: 3000, // min time for player to pull the fish
            maxPull: 13000, // max time for player to pull the fish
            timeToHook: 800, // player must click time faster then given value after fish is hooked
            maxTimeInRed: 1000 // game lost when player pulls in shaking red state longer than given time
        }
        this.state = 'inactive'
        this.timeInRed = 0
        this.maxGameTime = this.waitTime + this.pullTime + 10000 // define max game time
        this.waitTime = this.calculateWaitTime(fishSize) // calculate game random wait time based on config values
        this.pullTime = this.calculatePullTime(fishSize) // calculate game random pull time based on config values
    }

    setState(state) {
        console.log('state changed: ' + this.state + ' -> ' + state)
        this.state = state;
    }

    calculateWaitTime(fishSize) {
        // todo consider fishSize
        return Math.floor(Math.random() * (this.const.maxWait - this.const.minWait + 1)) + this.const.minWait;
    }

    calculatePullTime(fishSize) {
        // todo consider fishSize
        return Math.floor(Math.random() * (this.const.maxPull - this.const.minPull + 1)) + this.const.minPull;
    }

    isWaitingTimeReached(elapsedTime) {
        return this.state === 'waiting' && this.waitTime < elapsedTime
    }

    checkMissedHook(elapsedTime, elapsedTimeSinceHooking) {
        return this.state === 'hooking' && elapsedTimeSinceHooking + this.const.timeToHook < totalElapsedTime
    }

    tooLoongInRedZone() {
        return this.timeInRed > this.const.maxTimeInRed
    }

    increaseTimeInRed(number) {
        this.timeInRed = Math.max(0, this.timeInRed + number);
    }

    increaseFrame(isMousePressed) {
        ++this.engine.frameCount
        this.adjustProgress(isMousePressed)
    }

    adjustProgress(isMousePressed) {
        if(this.state === 'pulling') {
            if (isMousePressed) {
                this.status.progress =  this.status.progress + fps;
                this.status.resistProgress = this.status.resistProgress + fps
            } else {
                this.status.progress = Math.max(0, this.status.progress - 10); // todo dynamic define how much fish is resisting
                this.status.resistProgress = this.status.resistProgress - fps * 2
            }
        }
    }

    getNormalizedProgress(){
        if (this.status.progress === 0 || this.pullTime === 0) {
            return 0
        }

        return (this.status.progress / this.pullTime).toFixed(4)
    }

    getResistProgress(){
        if (this.status.resistProgress === 0) {
            return 0;
        }

        return Math.min(1.5, 1 + this.status.resistProgress / 5000)
    }

    checkWin() {
        return this.state === 'pulling' && this.status.progress > this.pullTime
    }
}

let game = new Game(10);



let circle = new ProgressBar.Circle('#circle', {
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
let debugCurrentResist = document.querySelector("#currentResist");
let debugWaitTime = document.querySelector("#waitTime");
let debugelapsedTimeSinceHooking2 = document.querySelector("#debugelapsedTimeSinceHooking2");
let fpsDebug = document.querySelector("#fps")
let results = document.querySelector("#canvas")


// listen mouse events
container.addEventListener("mousedown", pressingDown, false);
container.addEventListener("mouseup", notPressingDown, false);
container.addEventListener("touchstart", touchStart, false);
container.addEventListener("touchend", touchEnd, false);

document.querySelector("#startBtn").addEventListener('click', function() {
    let fishSize = document.querySelector("#fishSize").value
    startGame(fishSize)
});

// let oldPress
// function clicked() {
//     if (game.state = 'pulling') {
//         //start count
//     }
//     console.log('clicked in ticker mode');
// }
// function released() {
//     console.log('released in ticker mode');
//     if (game.state = 'pulling') {
//         // add count to test
//     }
// }

async function ticker() {
    let now = Date.now()
    totalElapsedTime = now - startedAt

    if (game.state === 'inactive') {
        return reset()
    }

    if (game.state === 'lost') {
        return
    }

    if (game.state === 'pulling' && game.maxGameTime < totalElapsedTime) {
        return await setGameLost('max game time reached')
    }

    // if (press !== oldPress) {
    //     // console.log('press changed from', oldPress, 'to', press);
    //     if (oldPress === false && press === true) {
    //         clicked()
    //     }
    //     if (oldPress === true && press === false) {
    //         console.log('press released');
    //         released()
    //     }
    //
    //     oldPress = press
    // }


    elapsed = now - then;

    // if enough time has elapsed, draw the next frame
    if (elapsed > game.engine.fpsInterval) {

        // Get ready for next frame by setting then=now, but...
        // Also, adjust for fpsInterval not being multiple of 16.67
        then = now - (elapsed % game.engine.fpsInterval);

        // DRAW
        updateDebug()

        if (game.isWaitingTimeReached(totalElapsedTime)) {
            setGameHooking()
        }

        if (game.checkMissedHook(totalElapsedTime, elapsedTimeSinceHooking)) {
            return await setGameLost('missed hook')
        }

        if (game.state === 'pulling') {
            await pullLogic()
        }

        if (isMousePressed) {
            if (game.state === 'waiting') {
                return await setGameLost('mouse pressed in waiting state')
            }

            if (game.checkWin()) {
                return await setGameWin()
            }

            if (game.state === 'hooking') {
                await setGamePulling()
            }
        }

        updateCircle();

        game.increaseFrame(isMousePressed)

        // DEBUG / REPORT
        let sinceStart = now - startedAt;
        let currentFps = Math.round(1000 / (sinceStart / game.engine.frameCount ) * 100) / 100;
        results.textContent = "Elapsed time= " + Math.round(sinceStart / 1000 * 100) / 100 + " secs"
        fpsDebug.textContent = currentFps + "fps."
    }

    requestAnimationFrame(ticker);
}

function pullLogic() {
    if (game.tooLoongInRedZone()) {
        return setGameLost('to much pull in red zone', game.timeInRed, game.const.maxTimeInRed)
    }

    if (inDanger) {
        game.increaseTimeInRed(30);
    } else {
        game.increaseTimeInRed(-30);
    }
}

function touchStart(e) {
    isMousePressed = true;
}

function touchEnd(e) {
    isMousePressed = false;
    resetItem();
}

function pressingDown(e) {
    // e.preventDefault();
    if (e.button !== 0) {
        return;
    }

    isMousePressed = true;
}

function notPressingDown(e) {
    e.preventDefault();

    if (e.button !== 0) {
        return;
    }

    isMousePressed = false;
    resetItem();
}

function updateCircle() {
    if (game.state === 'pulling') {

        pullingCss()
        circle.set(game.getNormalizedProgress())
    }
}

function resetItem() {
    console.log('reset item')
    itemContainer.classList.remove("shake-constant")
    itemContainer.classList.remove("shake-slow")
    itemContainer.classList.remove("shake-little")
    game.status.resistProgress = 0
}

function reset()
{
    itemContainer.style.display = "none";
    hookingCss(false)
    waitingCss(false)
    pullingCss(0, false)

    elapsedTimeSinceHooking = 0
    totalElapsedTime = 0
    startingTime = 0
    startedAt = 0

    game.setState('inactive')
}

function startGame(fishSize)
{
    reset()
    itemContainer.style.display = "block";

    game = new Game(fishSize);

    console.log('game started with fish: ' + fishSize, game)
    game.setState('waiting')
    waitingCss()

    startedAt = Date.now()
    then = startedAt
    ticker();
}

function setGameHooking()
{
    waitingCss(false)
    hookingCss()
    game.setState('hooking')
    elapsedTimeSinceHooking = totalElapsedTime
}

async function setGamePulling()
{
    circle.set(0)
    circle.animate(1.0, {duration: 500})
    await sleep(500);
    hookingCss(false)
    circle.set(0)
    game.setState('pulling')
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

    game.setState('lost')
    reset()

    // make request, todo notify about lost game
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

    game.setState('win')
    reset()
    // make request, todo notify about won game
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

function pullingCss(activate = true)
{
    if (activate) {
        // console.log('current size', size);
        let size = game.getResistProgress();
        fishIcon.style.display = "inline-block";

        if (size < 1.2) {
            // dragItem.classList.add("border-green")
            inDanger = false
            dragItem.classList.remove("border-yellow")
            dragItem.classList.remove("border-red")
        } else if (size >= 1.2 && size <= 1.3) {
            inDanger = false
            dragItem.classList.remove("border-green")
            dragItem.classList.add("border-yellow")
            dragItem.classList.remove("border-red")

            itemContainer.classList.remove("shake-slow")
            itemContainer.classList.add("shake-little")
            itemContainer.classList.add("shake-constant")
        } else if (size > 1.3 && size < 1.5) {
            inDanger = true
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

/**
 *  HELP FUNCTIONS
 */


function updateDebug()
{
    debugCurrentState.textContent = 'Game State: ' + game.state;
    debugTotalTime.textContent = 'TotalElapsedTime: ' + Math.round(totalElapsedTime) + ' ms';
    debugelapsedTimeSinceHooking2.textContent = 'timeInRed: ' + game.timeInRed
    debugMaxGameTime.textContent = 'Max Game time : ' + game.maxGameTime + ' ms';
    debugPullNeeded.textContent = 'Pull time needed: ' +  game.pullTime;
    debugCurrentResist.textContent = 'Resist: ' +  game.getResistProgress()
    debugCurrentTension.textContent = 'Progress: ' +  game.getNormalizedProgress() +' (' + Math.round(game.getNormalizedProgress() * 100) + '%)';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
