<template>
  <div class="cursor">
    {{ title }}<br/>
    X: {{ x }}, Y: {{ y }}<br/>
    {{ collision }}
  </div>
</template>

<script setup>
import { ref, watch, inject, toRaw, defineEmits } from 'vue'

const sharedVariable = inject('sharedVariable');
const props = defineProps(
  ['title', 'landmark']
)
const x = ref(0);
const y = ref(0);
const collision = ref(false);

//https://navigate-online-store.com/vue3-props-emit/
const emit = defineEmits(['onSendMessage']);

watch(
  () => props.landmark, (newLandmark) => {
    // localLandmark.value = newLandmark;
    x.value = (640 - newLandmark?.x * 640).toFixed(1);
    y.value = (newLandmark?.y * 480).toFixed(1);
    // console.log(props.title)
    collisionDetect();
  }
);

const fuga = [];
function collisionDetect(){
  const shapesJSON = toRaw(sharedVariable.value);
  for(const [index, shape] of Object.entries(shapesJSON)){
    if (shape.type === 'rect') {
      if( x.value >= shape.x && x.value <= shape.x + shape.width && y.value >= shape.y && y.value <= shape.y + shape.height ){
        if(collision.value === false){
          emit('onSendMessage', { name:index, x:x.value, y:y.value, title:props.title });
        }
        fuga[index] = true;
      } else {
        fuga[index] = false;
      }
    }
    else if (shape.type === 'circle') {  
      const dx = x.value - shape.x;
      const dy = y.value - shape.y;
      if ((dx * dx + dy * dy) <= (shape.radius * shape.radius)){
        if(collision.value === false){
          emit('onSendMessage', { name:index, x:x.value, y:y.value, title:props.title });
        }
        fuga[index] = true;
      } else {
        fuga[index] = false;
      }
    }
  };
  //https://ics.media/entry/200825/
  const isEvery = fuga.find(item => item === true);
  if(isEvery){
    collision.value = true;
  } else {
    collision.value = false;
  }
};

</script>