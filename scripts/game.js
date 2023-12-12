// ------------------- SCRIPT FOR GAME SETTINGS PAGE (index.html)----------------
let playerName = ''; // Variable to store player's name
let selectedTexture = null; // Variable to store selected texture

document.addEventListener('DOMContentLoaded', function () {
    const saveButton = document.getElementById('saveButton');
    const startButton = document.getElementById('startButton');
    const playerNameInput = document.querySelector('.nameContainer input[type="text"]');
    const playerNameDisplay = document.querySelector('.playerInnerContainer2 h3');
    const textures = document.querySelectorAll('#ballTextureContainer div');

    saveButton.addEventListener('click', function () {
        playerName = playerNameInput.value.trim();

        if (playerName) {
            playerNameDisplay.textContent = playerName;
        } else {
            alert('Please enter a valid player name and press "Submit"');
        }
    });

    // Alert if Start Game button is clicked without a valid player name
    startButton.addEventListener('click', function () {
        if (!playerName) {
            alert('Please enter a player name and press "Submit" to continue');
        } else {
            // Logic to start the game goes here
            console.log('Starting game with player:', playerName);
            // Redirect to game.html with playerName and selectedTexture as query parameters
            window.location.href = 'game.html?playerName=' + encodeURIComponent(playerName) + '&selectedTexture=' + encodeURIComponent(selectedTexture);
        }
    });

    textures.forEach(texture => {
        texture.addEventListener('click', function () {
            // Remove selection from all textures
            textures.forEach(t => t.classList.remove('texture-selected'));

            // Add selection class to clicked texture
            texture.classList.add('texture-selected');

            // Save the selected texture
            selectedTexture = texture.getAttribute('data-texture');
            console.log("Selected Texture:", selectedTexture); // For testing, remove later
        });
    });
});


// ------------------- SCRIPT FOR MAIN GAME PAGE (game.html)----------------

//import { Howl, Howler } from "../howler.js/dist/howler";
let renderer, scene, camera, pointLight, spotLight;

// Field variables
let fieldWidth = 400,
    fieldHeight = 200;

//const { Howl, Howler } = require("howler");
//Variables for the paddles
let paddleWidth, paddleHeight, paddleDepth, paddleQuality;
let paddle1DirY = 0;
let paddle2DirY = 0;
let paddleSpeed = 6;

// Ball Varibales
let ball, paddle1, paddle2;
let ballDirX = 1;
let ballDirY = 1;
let ballSpeed = 2.5;

// Game tracking variables
let score1 = 0;
let score2 = 0;

// Max score: Whoever
let maxScore = 7;

// Set opponetn refleces
let difficulty = 0.2;

//Controller Variables
let controllerIndex = null;
let leftPressed = false;
let rightPressed = false;
let upPressed = false;
let downPressed = false;
let speedPressed = false; // When this is pressed, the paddle is sped up
let isPaused = false;
let isResumed = false;

//Sound effect
// let Sound = new Howl({
//   src: ["../howler.js/examples/player/audio/80s_vibe.mp3"],
//   volume: 1.0,da
//   loop: false,
//   autoplay: true,
// });
// let sound = new Howl({
//   src: ["../howler.js/examples/player/audio/80s_vibe.mp3"],
// }).play();

let ballTexture = new THREE.ImageUtils.loadTexture("./img/ball/ball4.jpg");

function setup() {
    // update the board to reflect the max score for match win
    document.getElementById("winnerBoard").innerHTML =
        "GAME OF " + maxScore;

    // Function to get query parameters from the URL
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Retrieve player name and selected texture from URL
    playerName = getQueryParam('playerName') || 'Player';
    selectedTexture = getQueryParam('selectedTexture') || 'defaultTexture';

    // Display player name on the game page
    document.getElementById('playerName').innerHTML = playerName;

    ballTexture = new THREE.ImageUtils.loadTexture(`./img/ball/ball${selectedTexture}.jpg`);

    // This resets the opponents score
    score1 = 0;
    score2 = 0;

    // set up all the 3D objects in the scene
    createScene();
    draw();
}

//Creating the scene
function createScene() {
    // set the scene size
    let WIDTH = 800;
    let HEIGHT = 500;

    // set some camera attributes
    let VIEW_ANGLE = 50,
        ASPECT = WIDTH / HEIGHT,
        NEAR = 0.1,
        FAR = 10000;

    let canvas = document.getElementById("gameCanvas");

    // create a WebGL renderer, camera
    // and a scene
    renderer = new THREE.WebGLRenderer();
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

    scene = new THREE.Scene();

    // add the camera to the scene
    scene.add(camera);

    // set a default position for the camera
    // not doing this somehow messes up shadow rendering
    camera.position.z = 320;

    // start the renderer
    renderer.setSize(WIDTH, HEIGHT);

    // attach the render-supplied DOM element
    canvas.appendChild(renderer.domElement);

    // set up the playing surface plane
    let planeWidth = fieldWidth,
        planeHeight = fieldHeight,
        planeQuality = 10;

    // create the paddle1's material
    let paddle1Material = new THREE.MeshLambertMaterial({
        color: 0xceaf57,
    });
    // create the paddle2's material
    let paddle2Material = new THREE.MeshLambertMaterial({
        color: 0xceaf57,
    });
    // create the plane's material
    let planeMaterial = new THREE.MeshLambertMaterial({
        color: 0x111111, //black
    });
    // create the table's material
    let tableMaterial = new THREE.MeshLambertMaterial({
        color: 0x666666,
    });
    // create the pillar's materiald
    let pillarMaterial = new THREE.MeshLambertMaterial({
        color: 0x666666,
    });
    // create the ground's material
    let groundMaterial = new THREE.MeshLambertMaterial({
        color: 0x888888,
    });

    // create the playing surface plane
    let plane = new THREE.Mesh(
        new THREE.PlaneGeometry(
            planeWidth * 0.95, // 95% of table width, since we want to show where the ball goes out-of-bounds
            planeHeight,
            planeQuality,
            planeQuality
        ),

        planeMaterial
    );

    scene.add(plane);
    plane.receiveShadow = true;

    let table = new THREE.Mesh(
        new THREE.CubeGeometry(
            planeWidth * 1.05, // this creates the feel of a billiards table, with a lining
            planeHeight * 1.03,
            100, // an arbitrary depth, the camera can't see much of it anyway
            planeQuality,
            planeQuality,
            1
        ),

        tableMaterial
    );
    table.position.z = -51; // we sink the table into the ground by 50 units. The extra 1 is so the plane can be seen
    scene.add(table);
    table.receiveShadow = true;

    // // set up the sphere vars
    // lower 'segment' and 'ring' values will increase performance
    let radius = 5,
        segments = 6,
        rings = 6;

    // // create the sphere's material
    let sphereMaterial = new THREE.MeshPhongMaterial({
        map: ballTexture,
    });

    // Create a ball with sphere geometry
    ball = new THREE.Mesh(
        new THREE.SphereGeometry(radius, segments, rings),

        sphereMaterial
    );

    // // add the sphere to the scene
    scene.add(ball);

    ball.position.x = 0;
    ball.position.y = 0;
    // set ball above the table surface
    ball.position.z = radius;
    ball.receiveShadow = true;
    ball.castShadow = true;

    // // set up the paddle vars
    paddleWidth = 10;
    paddleHeight = 30;
    paddleDepth = 10;
    paddleQuality = 1;

    paddle1 = new THREE.Mesh(
        new THREE.CubeGeometry(
            paddleWidth,
            paddleHeight,
            paddleDepth,
            paddleQuality,
            paddleQuality,
            paddleQuality
        ),

        paddle1Material
    );

    // // add the sphere to the scene
    scene.add(paddle1);
    paddle1.receiveShadow = true;
    paddle1.castShadow = true;

    paddle2 = new THREE.Mesh(
        new THREE.CubeGeometry(
            paddleWidth,
            paddleHeight,
            paddleDepth,
            paddleQuality,
            paddleQuality,
            paddleQuality
        ),

        paddle2Material
    );

    // // add the sphere to the scene
    scene.add(paddle2);
    paddle2.receiveShadow = true;
    paddle2.castShadow = true;

    // set paddles on each side of the table
    paddle1.position.x = -fieldWidth / 2 + paddleWidth;
    paddle2.position.x = fieldWidth / 2 - paddleWidth;

    // lift paddles over playing surface
    paddle1.position.z = paddleDepth;
    paddle2.position.z = paddleDepth;

    // we iterate 10x (5x each side) to create pillars to show off shadows
    // this is for the pillars on the left
    for (let i = 0; i < 5; i++) {
        let backdrop = new THREE.Mesh(
            new THREE.CubeGeometry(30, 30, 300, 1, 1, 1),

            pillarMaterial
        );

        backdrop.position.x = -50 + i * 100;
        backdrop.position.y = 230;
        backdrop.position.z = -30;
        backdrop.castShadow = true;
        backdrop.receiveShadow = true;
        scene.add(backdrop);
    }
    // we iterate 10x (5x each side) to create pillars to show off shadows
    // this is for the pillars on the right
    for (let i = 0; i < 5; i++) {
        let backdrop = new THREE.Mesh(
            new THREE.CubeGeometry(30, 30, 300, 1, 1, 1),

            pillarMaterial
        );

        backdrop.position.x = -50 + i * 100;
        backdrop.position.y = -230;
        backdrop.position.z = -30;
        backdrop.castShadow = true;
        backdrop.receiveShadow = true;
        scene.add(backdrop);
    }

    // finally we finish by adding a ground plane
    // to show off pretty shadows
    let ground = new THREE.Mesh(
        new THREE.CubeGeometry(1000, 1000, 3, 1, 1, 1),

        groundMaterial
    );
    // set ground to arbitrary z position to best show off shadowing
    ground.position.z = -132;
    ground.receiveShadow = true;
    scene.add(ground);

    // // create a point light
    pointLight = new THREE.PointLight(0xf8d898);

    // set its position
    pointLight.position.x = -1000;
    pointLight.position.y = 0;
    pointLight.position.z = 1000;
    pointLight.intensity = 2.9;
    pointLight.distance = 10000;
    // add to the scene
    scene.add(pointLight);

    // add a spot light
    // this is important for casting shadows
    spotLight = new THREE.SpotLight(0xf8d898);
    spotLight.position.set(0, 0, 460);
    spotLight.intensity = 1.5;
    spotLight.castShadow = true;
    scene.add(spotLight);

    // MAGIC SHADOW CREATOR DELUXE EDITION with Lights PackTM DLC
    renderer.shadowMapEnabled = true;
}

function stopGameLoop() {
    if (!ispaused) {
        requestAnimationFrame(draw);
        controllerInput();
        ballPhysics();
        paddlePhysics();
        cameraPhysics();
        playerPaddleMovement();
        opponentPaddleMovement();
    }
}

function startGameLoop() {
    if (isPaused) {
    }
}

// function paused(isResumed) {
//   const gamepad = navigator.getGamepads()[controllerIndex];
//   const buttons = gamepad.buttons;
//   isResumed = buttons[2].pressed;
//   if (isResumed == true) {
//     isPaused = !isPaused;
//     draw();
//   } else {
//     paused(isResumed);
//   }
// }
function draw() {
    controllerInput();
    // draw THREE.JS scene
    renderer.render(scene, camera);
    // loop draw function call
    requestAnimationFrame(draw);
    controllerInput();
    ballPhysics();
    paddlePhysics();
    cameraPhysics();
    playerPaddleMovement();
    opponentPaddleMovement();
}

//Rotation of the ball with texture
let rot = 0.1;

function ballPhysics() {
    // if ball goes off the 'left' side (Player's side)
    if (ball.position.x <= -fieldWidth / 2) {
        // CPU scores
        score2++;
        // update scoreboard HTML
        document.getElementById("scores").innerHTML = score1 + "-" + score2;
        // reset ball to center
        resetBall(2);
        matchScoreCheck();
    }

    // if ball goes off the 'right' side (CPU's side)
    if (ball.position.x >= fieldWidth / 2) {
        // Player scores
        score1++;
        // update scoreboard HTML
        document.getElementById("scores").innerHTML = score1 + "-" + score2;
        // reset ball to center
        resetBall(1);
        matchScoreCheck();
    }

    // if ball goes off the top side (side of table)
    if (ball.position.y <= -fieldHeight / 2) {
        ballDirY = -ballDirY;
    }
    // if ball goes off the bottom side (side of table)
    if (ball.position.y >= fieldHeight / 2) {
        ballDirY = -ballDirY;
    }

    // update ball position over time
    ball.position.x += ballDirX * ballSpeed;
    ball.position.y += ballDirY * ballSpeed;

    // limit ball's y-speed to 2x the x-speed
    // this is so the ball doesn't speed from left to right super fast
    // keeps game playable for humans
    if (ballDirY > ballSpeed * 2) {
        ballDirY = ballSpeed * 2;
    } else if (ballDirY < -ballSpeed * 2) {
        ballDirY = -ballSpeed * 2;
    }
    if (rot > 100) rot = 0.01;
    rot += 0.5;
    ball.rotation.y = rot;
    ball.rotation.z = rot;
}

// Connecting the controller

//Event for wheen the controller is disconnected
window.addEventListener("gamepadconnected", (event) => {
    controllerIndex = event.gamepad.index;
    console.log("connected");
});

//Event for when the controller is connected
window.addEventListener("gamepaddisconnected", (event) => {
    console.log("disconnected");
    controllerIndex = null;
});

function controllerInput() {
    if (controllerIndex !== null) {
        const gamepad = navigator.getGamepads()[controllerIndex];
        const buttons = gamepad.buttons;
        upPressed = buttons[12].pressed;
        downPressed = buttons[13].pressed;
        leftPressed = buttons[14].pressed;
        rightPressed = buttons[15].pressed;
        speedPressed = buttons[0].pressed;
        isPaused = buttons[1].pressed;
        //console.log(isPaused);
        isResumed = buttons[2].pressed;
        if (isResumed) {
            isPaused = !isPaused;
            //isResumed = !isResumed;
        }
        print;

        const stickDeadZone = 0.4;
        const leftRightValue = gamepad.axes[0];

        if (leftRightValue >= stickDeadZone) {
            rightPressed = true;
        } else if (leftRightValue <= -stickDeadZone) {
            leftPressed = true;
        }
    }
}

function NegateBool(value) {
    return !value;
}

// Handles CPU paddle movement and logic
function opponentPaddleMovement() {
    // Lerp towards the ball on the y plane
    paddle2DirY = (ball.position.y - paddle2.position.y) * difficulty;

    // in case the Lerp function produces a value above max paddle speed, we clamp it
    if (Math.abs(paddle2DirY) <= paddleSpeed) {
        paddle2.position.y += paddle2DirY;
    }
    // if the lerp value is too high, we have to limit speed to paddleSpeed
    else {
        // if paddle is lerping in +ve direction
        if (paddle2DirY > paddleSpeed) {
            paddle2.position.y += paddleSpeed;
        }
        // if paddle is lerping in -ve direction
        else if (paddle2DirY < -paddleSpeed) {
            paddle2.position.y -= paddleSpeed;
        }
    }
    // We lerp the scale back to 1
    // this is done because we stretch the paddle at some points
    // stretching is done when paddle touches side of table and when paddle hits ball
    // by doing this here, we ensure paddle always comes back to default size
    paddle2.scale.y += (1 - paddle2.scale.y) * 0.2;
}

// Handles player's paddle movement
function playerPaddleMovement() {
    // move left
    if ((Key.isDown(Key.A) && !speedPressed) || (leftPressed && !speedPressed)) {
        // if paddle is not touching the side of table
        // we move
        if (paddle1.position.y < fieldHeight * 0.45) {
            paddle1DirY = paddleSpeed * 0.5;
        }
            // else we don't move and stretch the paddle
        // to indicate we can't move
        else {
            paddle1DirY = 0;
            paddle1.scale.z += (10 - paddle1.scale.z) * 0.2;
        }
    }
        //if the speed up button button and move button
    //is pressed, we speed up
    else if (
        (Key.isDown(Key.A) && speedPressed) ||
        (leftPressed && speedPressed)
    ) {
        // if paddle is not touching the side of table
        // we move
        if (paddle1.position.y < fieldHeight * 0.45) {
            paddle1DirY = paddleSpeed * 1;
        }
            // else we don't move and stretch the paddle
        // to indicate we can't move
        else {
            paddle1DirY = 0;
            paddle1.scale.z += (10 - paddle1.scale.z) * 0.2;
        }
    }
    // move right
    else if (
        (Key.isDown(Key.D) && !speedPressed) ||
        (rightPressed && !speedPressed)
    ) {
        // if paddle is not touching the side of table
        // we move
        if (paddle1.position.y > -fieldHeight * 0.45) {
            paddle1DirY = -paddleSpeed * 0.5;
        }
            // else we don't move and stretch the paddle
        // to indicate we can't move
        else {
            paddle1DirY = 0;
            paddle1.scale.z += (10 - paddle1.scale.z) * 0.2;
        }
    }
    //speed right
    else if (
        (Key.isDown(Key.D) && speedPressed) ||
        (rightPressed && speedPressed)
    ) {
        // if paddle is not touching the side of table
        // we move
        if (paddle1.position.y > -fieldHeight * 0.45) {
            paddle1DirY = -paddleSpeed * 1;
        }
            // else we don't move and stretch the paddle
        // to indicate we can't move
        else {
            paddle1DirY = 0;
            paddle1.scale.z += (10 - paddle1.scale.z) * 0.2;
        }
    }
    // else don't move paddle
    else {
        // stop the paddle
        paddle1DirY = 0;
    }

    paddle1.scale.y += (1 - paddle1.scale.y) * 0.2;
    paddle1.scale.z += (1 - paddle1.scale.z) * 0.2;
    paddle1.position.y += paddle1DirY;
}

// Handles camera and lighting logic
function cameraPhysics() {
    // we can easily notice shadows if we dynamically move lights during the game
    spotLight.position.x = ball.position.x * 2;
    spotLight.position.y = ball.position.y * 2;

    // move to behind the player's paddle
    camera.position.x = paddle1.position.x - 100;
    camera.position.y += (paddle1.position.y - camera.position.y) * 0.05;
    camera.position.z =
        paddle1.position.z + 100 + 0.04 * (-ball.position.x + paddle1.position.x);

    // rotate to face towards the opponent
    camera.rotation.x = (-0.01 * ball.position.y * Math.PI) / 180;
    camera.rotation.y = (-60 * Math.PI) / 180;
    camera.rotation.z = (-90 * Math.PI) / 180;
}

// Handles paddle collision logic
function paddlePhysics() {
    // PLAYER PADDLE LOGIC

    // if ball is aligned with paddle1 on x plane
    // remember the position is the CENTER of the object
    // we only check between the front and the middle of the paddle (one-way collision)
    if (
        ball.position.x <= paddle1.position.x + paddleWidth &&
        ball.position.x >= paddle1.position.x
    ) {
        // and if ball is aligned with paddle1 on y plane
        if (
            ball.position.y <= paddle1.position.y + paddleHeight / 2 &&
            ball.position.y >= paddle1.position.y - paddleHeight / 2
        ) {
            // and if ball is travelling towards player (-ve direction)
            if (ballDirX < 0) {
                // stretch the paddle to indicate a hit
                //paddle1.scale.y = 15;
                // switch direction of ball travel to create bounce
                ballDirX = -ballDirX;
                // we impact ball angle when hitting it
                // this is not realistic physics, just spices up the gameplay
                // allows you to 'slice' the ball to beat the opponent
                ballDirY -= paddle1DirY * 0.7;
            }
        }
    }
    // OPPONENT PADDLE LOGIC

    // if ball is aligned with paddle2 on x plane
    // remember the position is the CENTER of the object
    // we only check between the front and the middle of the paddle (one-way collision)
    if (
        ball.position.x <= paddle2.position.x + paddleWidth &&
        ball.position.x >= paddle2.position.x
    ) {
        // and if ball is aligned with paddle2 on y plane
        if (
            ball.position.y <= paddle2.position.y + paddleHeight / 2 &&
            ball.position.y >= paddle2.position.y - paddleHeight / 2
        ) {
            // and if ball is travelling towards opponent (+ve direction)
            if (ballDirX > 0) {
                // stretch the paddle to indicate a hit
                //paddle2.scale.y = 15;
                // switch direction of ball travel to create bounce
                ballDirX = -ballDirX;
                // we impact ball angle when hitting it
                // this is not realistic physics, just spices up the gameplay
                // allows you to 'slice' the ball to beat the opponent
                ballDirY -= paddle2DirY * 0.7;
            }
        }
    }
}

function resetBall(loser) {
    // position the ball in the center of the table
    ball.position.x = 0;
    ball.position.y = 0;

    // if player lost the last point, we send the ball to opponent
    if (loser == 1) {
        ballDirX = -1;
    }
    // else if opponent lost, we send ball to player
    else {
        ballDirX = 1;
    }

    // set the ball to move +ve in y plane (towards left from the camera)
    ballDirY = 1;
}

let bounceTime = 0;

// checks if either player or opponent has reached 7 points
function matchScoreCheck() {
    // if player has 7 points
    if (score1 >= maxScore) {
        // stop the ball
        ballSpeed = 0;
        // write to the banner
        document.getElementById("scores").innerHTML = "YOU WON!";
        document.getElementById("winnerBoard").innerHTML = "Refresh to play again";
        // make paddle bounce up and down
        bounceTime++;
        paddle1.position.z = Math.sin(bounceTime * 0.1) * 10;
        // enlarge and squish paddle to emulate joy
        paddle1.scale.z = 2 + Math.abs(Math.sin(bounceTime * 0.1)) * 10;
        paddle1.scale.y = 2 + Math.abs(Math.sin(bounceTime * 0.05)) * 10;
    }
    // else if opponent has 7 points
    else if (score2 >= maxScore) {
        // stop the ball
        ballSpeed = 0;
        // write to the banner
        document.getElementById("scores").innerHTML = "CPU WINS!";
        document.getElementById("winnerBoard").innerHTML = "Refresh to play again";
        // make paddle bounce up and down
        bounceTime++;
        paddle2.position.z = Math.sin(bounceTime * 0.1) * 10;
        // enlarge and squish paddle to emulate joy
        paddle2.scale.z = 2 + Math.abs(Math.sin(bounceTime * 0.1)) * 10;
        paddle2.scale.y = 2 + Math.abs(Math.sin(bounceTime * 0.05)) * 10;
    }
}

