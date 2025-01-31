let DEBUG = true
var leftEye
var resizedLeftEye
let CHECK = false

var text = document.getElementById("open_check");
var canvas2 = document.createElement("CANVAS");
canvas2.id = "canvas2"
canvas2.width = 300
canvas2.height = 150
canvas2.style.position = "absolute";
var canvas3 = document.createElement("CANVAS");
canvas3.id = "canvas3"
canvas3.width = canvas2.width
canvas3.height = canvas2.height
canvas3.style.position = "absolute";


document.getElementById("container").appendChild(canvas2);
document.getElementById("container").appendChild(canvas3);


var bufferX = [0, 0, 0, 0, 0]
var bufferY = [0, 0, 0, 0, 0]
const bufferSize = 5;
var flag = 0;
var threshold = 35;

var input1 = document.getElementById("message");
input1.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("button").click();
    }
});

var input2 = document.getElementById("name");
input2.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("nicknamebutton").click();
    }
});

if (!DEBUG) {
    canvas2.style.display = "none";
    canvas3.style.display = "none";
}


Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo)

let src = new cv.Mat(document.getElementById("localVideo").height, document.getElementById("localVideo").width, cv.CV_8UC4);
let dst = new cv.Mat(document.getElementById("localVideo").height, document.getElementById("localVideo").width, cv.CV_8UC1);
let cap = new cv.VideoCapture(document.getElementById("localVideo"));
const LEFT_EYE_POINTS = [36, 37, 38, 39, 40, 41]
const RIGHT_EYE_POINTS = [42, 43, 44, 45, 46, 47]

document.getElementById("localVideo").addEventListener('play', () => {
    // Create the overlayed canvas and append it to body
    const canvas = faceapi.createCanvasFromMedia(document.getElementById("localVideo"))
    document.getElementById('canvas_place').append(canvas)
    let image;

    var generateRandom = function (min, max) {
        var ranNum = Math.floor(Math.random() * (max - min + 1)) + min;
        return ranNum;
    }
    var rand_num = generateRandom(0, 13);

    if (!image) {
        image = document.createElement('img');
        image.src = 'assets/' + rand_num + '.png';
    }

    const displaySize = {
        width: document.getElementById("localVideo").width,
        height: document.getElementById("localVideo").height
    }
    faceapi.matchDimensions(canvas, displaySize) // match dimensions of canvas and video feed

    // Get context of canvas2, canvas3
    let ctx3 = canvas.getContext('2d');


    var ctx = canvas2.getContext("2d");
    ctx.fillStyle = "#FF0000";
    var ctx2 = canvas3.getContext("2d");
    // ctx2.fillStyle = "#FF0000";
    setInterval(async () => {

        // Detect faces with face-api
        const detections = await faceapi.detectAllFaces(document.getElementById("localVideo"), new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()

        // Resize the detections to match the canvas size
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        // Clear the canvases before doing anything
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
        canvas2.getContext('2d').clearRect(0, 0, canvas2.width, canvas2.height)
        canvas3.getContext('2d').clearRect(0, 0, canvas3.width, canvas3.height)

        // If Debug mode is ON draw the face-api detections on the first canvas that is overlayed on the video feed
        if (DEBUG) {
            faceapi.draw.drawDetections(canvas, resizedDetections)
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
        }

        // Check if there's only 1 face on the feed and change the BG color of winkScroll class element
        if (detections.length == 1) {
            leftEye = detections[0].landmarks.getLeftEye()
            resizedLeftEye = resizedDetections[0].landmarks.getLeftEye()
            for (var i = 0; i < document.getElementsByClassName("winkScroll").length | 0; i++) {
                document.getElementsByClassName("winkScroll")[i].style.backgroundColor = "#e6faff";
            }
        } else {
            for (var i = 0; i < document.getElementsByClassName("winkScroll").length | 0; i++) {
                document.getElementsByClassName("winkScroll")[i].style.backgroundColor = "white";
            }
        }

        var disX = distance(resizedLeftEye[0], resizedLeftEye[3]) / 2
        var disY = distance(resizedLeftEye[1], resizedLeftEye[4]) - 5


        const box = detections[0]['detection']['box'];
        const x = box['x'];
        const y = box['y'];
        const width = box['_width'];
        const height = box['_height'];

        console.log(image)
        if (CHECK) {
            ctx3.drawImage(image, x, y, width, height);
        }


        // Draw cropped image on canvas2
        // https://stackoverflow.com/questions/26015497/how-to-resize-then-crop-an -image-with-canvas
        ctx.drawImage(document.getElementById("localVideo"),
            leftEye[0].x + 10,        // start X
            leftEye[0].y - 3,        // start Y
            disX, disY,                                           // area to crop
            0, 0,                                                 // Place the result at 0, 0 in the canvas,
            canvas2.width, canvas2.height)                                             // with this width height (Scale)

        // IMAGE PROCESSING
        let src = cv.imread('canvas2');
        let dst = new cv.Mat();
        //bilateralFilter (https://docs.opencv.org/3.4/dd/d6a/tutorial_js_filtering.html)
        cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
        cv.bilateralFilter(src, dst, 10, 15, 15);
        //erode (https://docs.opencv.org/3.4/d4/d76/tutorial_js_morphological_ops.html)
        let M = cv.Mat.ones(3, 3, cv.CV_8U);
        let anchor = new cv.Point(-1, -1);
        cv.erode(dst, src, M, anchor, 3, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());

        // https://docs.opencv.org/master/de/d06/tutorial_js_basic_ops.html
        let row = 3, col = 4;
        var A = 0;
        var rel_lum = 0;
        var lum2 = 0;
        var l709 = 0;
        var l601 = 0;
        if (src.isContinuous()) {
            let R = src.data[row * src.cols * src.channels() + col * src.channels()];
            let G = src.data[row * src.cols * src.channels() + col * src.channels() + 1];
            let B = src.data[row * src.cols * src.channels() + col * src.channels() + 2];
            A = src.data[row * src.cols * src.channels() + col * src.channels() + 3];
            rel_lum = (0.2126 * R + 0.7152 * G + 0.0722 * B);
            lum2 = (0.299 * R + 0.587 * G + 0.114 * B);
            l709 = 0.2126 * R + 0.7152 * G + 0.0722 * B;
            l601 = 0.299 * R + 0.587 * G + 0.114 * B;
        }

        // Binary Threshold (https://docs.opencv.org/3.4/d7/dd0/tutorial_js_thresholding.html)
        cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
        cv.threshold(src, dst, threshold, 255, cv.THRESH_BINARY);


        if (dst.isContinuous()) {
            var BW = dst.data;
            var no_of_zeros = BW.filter(v => v === 0).length;
            var ratio_of_blacks = 1 - (no_of_zeros / BW.length);
            console.log("No of 0: " + no_of_zeros);
            console.log("Ratio of blacks: " + ratio_of_blacks);

            console.log("TH:" + threshold);

            if (ratio_of_blacks > 0.50) {
                threshold += 5;
            } else if (ratio_of_blacks < 0.50) {
                threshold -= 5;
            }
        }

        // Find contours (https://docs.opencv.org/3.4/d5/daa/tutorial_js_contours_begin.html)
        let dst2 = cv.Mat.zeros(dst.rows, dst.cols, cv.CV_8UC3);
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(dst, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_NONE);

        for (let i = 0; i < contours.size(); ++i) {
            let color = new cv.Scalar(255, 0, 0);
            cv.drawContours(dst2, contours, i, color, 1, cv.LINE_8, hierarchy, 100);
        }

        // Get centroid (https://docs.opencv.org/3.4/dc/dcf/tutorial_js_contour_features.html)
        let cnt = contours.get(0);
        let Moments = cv.moments(cnt, false);

        let cx = Moments.m10 / Moments.m00
        let cy = Moments.m01 / Moments.m00

        // Draw processed image in canvas3
        src.delete();
        dst.delete();
        contours.delete();
        hierarchy.delete();
        dst2.delete();

        // Fill the buffer if centroid exists
        if (cx != null && cx != 0 && cy != null && cy != 0 && !Number.isNaN(cx) && !Number.isNaN(cy)) {
            if (flag > bufferSize) {
                flag = 0
            }
            bufferX[flag] = cx
            bufferY[flag] = cy
            flag += 1
        }

        // Calculate Moving Average of Centrorid for bufferX and bufferY respectively
        // MA helps dealing with huge flunctuations and distinguises eye winking from eye blinking
        cx = movingAVG()[0]
        cy = movingAVG()[1]

        // Draw the Centroid on canvas2
        // ctx.fillRect(cx, cy, 5, 5);

        // Check if y axes of centroid is more than a threshold (that means eye winking)
        if (cy > 5 * 150 / 7) {
            if (DEBUG) {
                console.log("closed")
                text.innerHTML = "Closed"
                text.style.backgroundColor = "red"
                CHECK = true

            }
            // pageScroll() // Scroll the element of class winkScroll
        } else {
            if (DEBUG) {
                console.log("open")
                text.innerHTML = "Open"
                text.style.backgroundColor = "white"
                CHECK = false
            }
        }

        // JUST AN EXTRA FEATURE - Changing Body color based on facial expressions
        // if(DEBUG && detections.length==1) {
        //   if(detections[0].expressions.neutral>0.7) {
        //     document.body.style.backgroundColor = "white";
        //   }
        //   else if(detections[0].expressions.happy>0.7){
        //     document.body.style.backgroundColor = "blue";
        //   }
        //   else if(detections[0].expressions.sad>0.7){
        //     document.body.style.backgroundColor = "grey";
        //   }
        //   else if(detections[0].expressions.angry>0.7){
        //     document.body.style.backgroundColor = "red";
        //   }
        //   else if(detections[0].expressions.disgusted>0.7){
        //     document.body.style.backgroundColor = "green";
        //   }
        //   else if(detections[0].expressions.fearful>0.7){
        //     document.body.style.backgroundColor = "lightblue";
        //   }
        //   else if(detections[0].expressions.surprised>0.7){
        //     document.body.style.backgroundColor = "yellow";
        //   }
        // }
    }, 100)
})

// FUNCTIONS
function movingAVG() {
    var x_total = 0
    var y_total = 0
    var actual_size = 0
    for (var i = 0; i < bufferSize; i++) {
        if (bufferX[i] != 0 && bufferY[i] != 0 && !Number.isNaN(bufferX[i]) && !Number.isNaN(bufferX[i])) {
            x_total += bufferX[i]
            y_total += bufferY[i]
            actual_size += 1
        }
    }
    return [x_total / actual_size, y_total / actual_size]
}

function distance(p1, p2) {
    /* Calculate the distance between 2 points

    Arguments:
        p1 (x, y): First point
        p2 (x, y): Second point
    */
    return Math.sqrt(Math.pow((p2.x - p1.x), 2) + Math.pow((p2.y - p1.y), 2));
}

function _middle_point(p1, p2) {
    /* Returns the middle point (x,y) between two points

    Arguments:
        p1 (x, y): First point
        p2 (x, y): Second point
    */
    x = int((p1.x + p2.x) / 2)
    y = int((p1.y + p2.y) / 2)
    return (x, y)
}

function getLandmarks(d) {
    /* Returns the Landmarks

    Arguments:
        d (e.g. detections[0]): a face detection object
    */
    return d.landmarks.positions;
}

function getDetectionBox(d) {
    /* Returns the detectionBox array which consists of bottomLeft, bottomRight, topLeft, topRight

    Arguments:
        d (e.g. detections[0]): a face detection object
    */
    return d.detection.box;
}