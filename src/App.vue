<template>
  <h1 class="text-center text-3xl mb-4">Air Drums</h1>
  <div class="stage">
    <video id="input_video" width="640px" height="480px" autoplay style="display:none"></video>  
    <canvas id="output_canvas"  width="640px" height="480px"></canvas>
    <canvas id="background" width="640px" height="480px"></canvas>
  </div>
  <div class="flex">
    <Cursor title="leftWrist" :landmark="leftWrist" @onSendMessage="incrementParent"/>
    <Cursor title="leftUnkle" :landmark="leftUnkle" @onSendMessage="incrementParent"/>
    <Cursor title="rightUnkle" :landmark="rightUnkle" @onSendMessage="incrementParent"/>
    <Cursor title="rightWrist" :landmark="rightWrist" @onSendMessage="incrementParent"/>
  </div>
</template>

<script setup>
import pose_landmarker_task from "./assets/pose_landmarker_lite.task";
import Particle from "./components/Particle.js";
let particlesArray = [];

/*
https://tonejs.github.io/docs/14.9.17/classes/Sampler.html
import aUrl from "./assets/A.mp3";
const multiPlayer = new Tone.Players({
    0: aUrl,
    1: bUrl,
}, () => {
    console.log('All sounds loaded');
}).toDestination();
*/
import * as Tone from "tone";
let multiPlayer;

/*
https://codepen.io/mediapipe-preview/pen/abRLMxN
https://medium.com/@kiyo07/integrating-mediapipe-tasks-vision-for-hand-landmark-detection-in-react-a2cfb9d543c7
*/
import { ref, onMounted, provide } from "@vue/runtime-core";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "@mediapipe/tasks-vision";

import Cursor from './components/Cursor.vue'
let poseLandmarker = undefined;
const rightWrist = ref(null);
const leftWrist = ref(null);
const rightUnkle = ref(null);
const leftUnkle = ref(null);

let sharedVariable = ref([]);
provide('sharedVariable', sharedVariable);

function incrementParent (val) {
  const particle = new Particle(640 - val.x, val.y, 1, 120);
  particlesArray.push(particle);
  multiPlayer.player(val.name).start();
  // exec("callback", JSON.stringify(val));
}

function loadShapes(jsonString) {
  let jsonObject;
  try {
    jsonObject = JSON.parse(jsonString);
  } catch (error) {
    // console.log(error);
    return;
  };
  const canvasElement = document.getElementById("background");
  const backgroundCtx = canvasElement.getContext("2d", { alpha: true });
  backgroundCtx.save();
  backgroundCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);        
  backgroundCtx.strokeStyle = "white";
  backgroundCtx.lineWidth = 5;
  jsonObject.forEach(shape => {
    if (shape.type === 'rect') {
      backgroundCtx.strokeRect(shape.x, shape.y, shape.width, shape.height)
    } else if (shape.type === 'circle') {
      backgroundCtx.beginPath();
      backgroundCtx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
      backgroundCtx.stroke();
    }
  });
  backgroundCtx.restore();
  sharedVariable.value = jsonObject;
}

function loadSounds(b64TextString){
  let jsonObject;
  try {
    jsonObject = JSON.parse(b64TextString);
  } catch (error) {
    // console.log(error);
    return;
  };
  let blobUrls = {};  
  for (const [index, b64Text] of Object.entries(jsonObject)){
    // console.log(b64Text)
    const blob = b64toBlob(b64Text, 'audio/mpeg');
    const blobUrl = URL.createObjectURL(blob);
    blobUrls[index] = blobUrl;
  }
  multiPlayer = new Tone.Players(blobUrls, () => {
      // console.log('All sounds loaded');
  }).toDestination();
}

function b64toBlob (b64Data, contentType='', sliceSize=512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  const blob = new Blob(byteArrays, {type: contentType});
  return blob;
}

function exec(s, p) {
  if(window.FileMaker != null) {
      window.FileMaker.PerformScriptWithOption(s, p, 5);
  } else {
      setTimeout(exec, 100, s, p); // 1s = 1000ms
  };
}

function setup(){
  const videoElement = document.getElementById("input_video");
  const canvasElement = document.getElementById("output_canvas");
  const canvasCtx = canvasElement.getContext("2d");
  const drawingUtils = new DrawingUtils(canvasCtx);  
  enableWebcam();

  function enableWebcam(event) {
    const constraints = {
      video: { 
        frameRate: { min: 30 },
      },
    };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      videoElement.srcObject = stream;
      videoElement.addEventListener("loadeddata", predictWebcam);
    });
  }
  
  let lastVideoTime = -1;
  async function predictWebcam() {
    let startTimeMs = performance.now();
    if (lastVideoTime !== videoElement.currentTime) {
      lastVideoTime = videoElement.currentTime;
      poseLandmarker.detectForVideo(videoElement, startTimeMs, (result) => {
        canvasCtx.save();
        // canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);        
        canvasCtx.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);
        for (const landmark of result.landmarks) {
          //
          leftWrist.value = landmark[15];
          rightWrist.value = landmark[16];
          rightUnkle.value = landmark[30];
          leftUnkle.value = landmark[27];
          //
          drawingUtils.drawLandmarks([
              landmark[15], //右手首
              landmark[16], //左手首
              landmark[27], //左足首
              landmark[30], //右足首
            ], {
            radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 10, 1),
            color: 'white',
          });
          const ARM_CONNECTIONS = [
            { "start":11, "end":13 }, // 右肩から右肘
            { "start":13, "end":15 }, // 右肘から右手首
            { "start":12, "end":14 }, // 左肩から左肘
            { "start":14, "end":16 }, // 左肘から左手首
          ];
          const LEG_CONNECTIONS = [
            { "start":24, "end":26 }, // 右腰から右膝
            { "start":26, "end":28 }, // 右膝から右足首
            { "start":28, "end":30 }, // 右足首から右かかと
            { "start":28, "end":32 }, // 右足首から右つま先
            { "start":23, "end":25 }, // 左腰から左膝
            { "start":25, "end":27 }, // 左膝から左足首
            { "start":27, "end":29 }, // 左足首から左かかと
            { "start":27, "end":31 }  // 左足首から左つま先
          ];
          // drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
          drawingUtils.drawConnectors(landmark, ARM_CONNECTIONS, {
            color: 'green',
            lineWidth: 5
          });
          drawingUtils.drawConnectors(landmark, LEG_CONNECTIONS, {
            color: 'red',
            lineWidth: 5
          });
        }
        for ( const particle of particlesArray ) {
          particle.update();
          canvasCtx.beginPath();
          canvasCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2, true);
          canvasCtx.fillStyle = "rgba(" + [230, 122, 122, particle.transparent] + ")";
          canvasCtx.fill();
          if(particle.radius<10){
            particlesArray.shift();
          }
        }
        canvasCtx.restore();
      });
    }
    window.requestAnimationFrame(predictWebcam);
  }
}

onMounted(() => {
  const createPoseLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        // modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        modelAssetPath: pose_landmarker_task,
        delegate: "GPU",
      },
      minPoseDetectionConfidence: 0.9,
      minPosePresenceConfidence: 0.9,
      minTrackingConfidence: 0.9,
      runningMode: "VIDEO",
      numPoses: 1
    });
    setup();
  };
  createPoseLandmarker();
})

window.loadShapes = loadShapes;
window.loadSounds = loadSounds;

</script>
