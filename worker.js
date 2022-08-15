import { MediaProcessor, setVonageMetadata } from '@vonage/media-processor';


if( 'function' === typeof importScripts) {

    const FACE_DETECTION_TIME_GAP = 200000;
    const AUTO_BRIGHTNESS_TIME_GAP = 200000;

    let mediaProcessor;

    let enableAutoZoom = true;
    let enableAutoBrightness = true;
    let enableAdjustBrightness = true;
    let fixedRatio = null;
    let faceTracking = null;
    let published = false;
    let brightnessLevel;
    let brightnessFactor;

    let padding;
    let videoInfo;
    let faceDimension;
    let frameMovingSteps;
    let visibleRectDimension;
    let visibleRectDimensionState;
    let faceDetectionlastTimestamp = 0;
    let autoBrightnesslastTimestamp = 0;

    let brightnessCanvas = new OffscreenCanvas(1, 1);
    let brightnessCanvasCtx = brightnessCanvas.getContext('2d', {alpha: false, desynchronized: true});
    let resultCanvas = new OffscreenCanvas(1, 1);
    let resultCanvasCtx = resultCanvas.getContext('2d', {alpha: false, desynchronized: true});
    if (!resultCanvasCtx || !brightnessCanvasCtx) {
      throw new Error('Unable to create OffscreenCanvasRenderingContext2D');
    }  

    /********************
     * Media Processing
     *******************/
    function createMediaProcessor() {
        return new Promise((resolve, reject) => {
          mediaProcessor = new MediaProcessor();
    
          mediaProcessor.on('error', ( eventData => {
            const msg = {callbackType: 'media_processor_error_event', message: eventData}
            postMessage(JSON.stringify(msg));
          }))
          mediaProcessor.on('warn', ( eventData => {
            const msg = {callbackType: 'media_processor_warn_event', message: eventData}
            postMessage(JSON.stringify(msg));
          }))
          mediaProcessor.on('pipelineInfo', ( eventData => {
            const msg = {callbackType: 'media_processor_pipeline_event', message: eventData}
            postMessage(JSON.stringify(msg))
          }))
          
          let transformers = []
          transformers.push({transform});
          mediaProcessor.setTransformers(transformers).then( () => {
    
            resolve()
          }).catch(e => {
            reject(e)
          })
        })
      }

    function transform(frame, controller) {        
        const timestamp = frame.timestamp;

        createImageBitmap(frame).then( image =>{
          frame.close()
          processFrame(controller, image, timestamp)
        }).catch(e => {
          controller.enqueue(frame)
        })
      }

    function processFrame(controller, image, timestamp){

        // Face Detection
        if(enableAutoZoom && (timestamp - faceDetectionlastTimestamp >= FACE_DETECTION_TIME_GAP)){
            faceDetectionlastTimestamp = timestamp;
            postMessage(image)
        }
        // Brightness Detection
        if(enableAdjustBrightness && enableAutoBrightness && (timestamp - autoBrightnesslastTimestamp >= AUTO_BRIGHTNESS_TIME_GAP)){
          autoBrightnesslastTimestamp = timestamp;
          brightnessCanvas.width = image.width;
          brightnessCanvas.height = image.height;
          if (visibleRectDimension) {
            brightnessCanvasCtx.drawImage(image, 
              visibleRectDimension.visibleRectX, 
              visibleRectDimension.visibleRectY,
              visibleRectDimension.visibleRectWidth,
              visibleRectDimension.visibleRectHeight,
              0,
              0,
              visibleRectDimension.visibleRectWidth,
              visibleRectDimension.visibleRectHeight);
            }
            else {
              brightnessCanvasCtx.drawImage(image, 0,0);
            }
          detectBrightness();
        }

        resultCanvas.width = image.width;
        resultCanvas.height = image.height;

        resultCanvasCtx.drawImage(image, 0, 0);

        if (enableAdjustBrightness && brightnessFactor) {
          const myImage = resultCanvasCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
          const picLength = resultCanvas.width * resultCanvas.height
          // Loop through data.
          let multiplier = brightnessFactor*brightnessLevel;
          for (var i = 0; i < picLength * 4; i += 4) {
            let average = parseInt((myImage.data[i] + myImage.data[i+1] + myImage.data[i+2])/3);

            let lightenPercent = (255 - average)/255*100*multiplier;
 
            let newR = parseInt(myImage.data[i] * (100 + lightenPercent) / 100);
            let newG = parseInt(myImage.data[i+1] * (100 + lightenPercent) / 100);
            let newB = parseInt(myImage.data[i+2] * (100 + lightenPercent) / 100);
  
            myImage.data[i] = newR;
            myImage.data[i+1] = newG;
            myImage.data[i+2] = newB;
          }
          resultCanvasCtx.putImageData(myImage, 0, 0);
        }

        if (enableAutoZoom && visibleRectDimension) {
          if (faceTracking) {
            if (visibleRectDimensionState.visibleRectX !== visibleRectDimension.visibleRectX) visibleRectDimensionState.visibleRectX = visibleRectDimensionState.visibleRectX > visibleRectDimension.visibleRectX ? visibleRectDimensionState.visibleRectX - frameMovingSteps.x : visibleRectDimensionState.visibleRectX + frameMovingSteps.x ;
            if (visibleRectDimensionState.visibleRectY !== visibleRectDimension.visibleRectY) visibleRectDimensionState.visibleRectY = visibleRectDimensionState.visibleRectY > visibleRectDimension.visibleRectY ? visibleRectDimensionState.visibleRectY - frameMovingSteps.y : visibleRectDimensionState.visibleRectY + frameMovingSteps.y;
            if (visibleRectDimensionState.visibleRectWidth !== visibleRectDimension.visibleRectWidth) visibleRectDimensionState.visibleRectWidth = visibleRectDimensionState.visibleRectWidth > visibleRectDimension.visibleRectWidth ? visibleRectDimensionState.visibleRectWidth - frameMovingSteps.width : visibleRectDimensionState.visibleRectWidth + frameMovingSteps.width;
            if (visibleRectDimensionState.visibleRectHeight !== visibleRectDimension.visibleRectHeight) visibleRectDimensionState.visibleRectHeight = visibleRectDimensionState.visibleRectHeight > visibleRectDimension.visibleRectHeight ? visibleRectDimensionState.visibleRectHeight - frameMovingSteps.height : visibleRectDimensionState.visibleRectHeight + frameMovingSteps.height;
            
            if (Math.abs(visibleRectDimensionState.visibleRectX - visibleRectDimension.visibleRectX) <= frameMovingSteps.x) visibleRectDimensionState.visibleRectX = visibleRectDimension.visibleRectX
            if (Math.abs(visibleRectDimensionState.visibleRectY  - visibleRectDimension.visibleRectY) <= frameMovingSteps.y) visibleRectDimensionState.visibleRectY = visibleRectDimension.visibleRectY
            if (Math.abs(visibleRectDimensionState.visibleRectWidth  - visibleRectDimension.visibleRectWidth) <= frameMovingSteps.width) visibleRectDimensionState.visibleRectWidth = visibleRectDimension.visibleRectWidth
            if (Math.abs(visibleRectDimensionState.visibleRectHeight  - visibleRectDimension.visibleRectHeight) <= frameMovingSteps.height) visibleRectDimensionState.visibleRectHeight = visibleRectDimension.visibleRectHeight
          
            // TODO:
            let deltaX = visibleRectDimensionState.visibleRectX + visibleRectDimensionState.visibleRectWidth;
            let deltaY = visibleRectDimensionState.visibleRectY + visibleRectDimensionState.visibleRectHeight;

            if (deltaX > videoInfo.width) visibleRectDimensionState.visibleRectWidth = visibleRectDimensionState.visibleRectWidth - (deltaX - videoInfo.width);
            if (deltaY > videoInfo.height) visibleRectDimensionState.visibleRectHeight = visibleRectDimensionState.visibleRectHeight - (deltaY - videoInfo.height);

          }
          const resizeFrame = new VideoFrame(resultCanvas, {
              visibleRect: {
                  x: visibleRectDimensionState.visibleRectX,
                  y: visibleRectDimensionState.visibleRectY,
                  width: visibleRectDimensionState.visibleRectWidth,
                  height: visibleRectDimensionState.visibleRectHeight
              },
              timestamp,
              alpha: 'discard'
          })
          if (!published) {
            const msg = {callbackType: 'publish'}
            postMessage(JSON.stringify(msg));
            published = true;         
          }
          controller.enqueue(resizeFrame)
        }
        else {
          controller.enqueue(new VideoFrame(resultCanvas, {timestamp, alpha: 'discard'}))
        }
        image.close()
      }

     /********************
     * Face Detection
     *******************/
    function calculateDimensions(forceRecalculate = false) {
        let newWidth = Math.floor((faceDimension.width * videoInfo.width) + (padding.width*2));
        let newHeight = Math.floor((faceDimension.height * videoInfo.height) + (padding.height*2));
        let newX = Math.floor((faceDimension.xCenter * videoInfo.width) - (faceDimension.width * videoInfo.width)/2) - padding.width;
        newX = Math.max(0, newX);
        let newY = Math.floor((faceDimension.yCenter * videoInfo.height) - (faceDimension.height * videoInfo.height)/2) - padding.height;
        newY = Math.max(0, newY);
        
        if (fixedRatio) {
            newWidth = fixedRatio * newHeight
            newX = Math.floor((faceDimension.xCenter * videoInfo.width) - (newWidth)/2);
            newX = Math.max(0, newX);
        }


        
        if (forceRecalculate || !visibleRectDimension || Math.abs(newX - visibleRectDimension.visibleRectX) > (faceTracking ? 10 : 70) || Math.abs(newY - visibleRectDimension.visibleRectY) > (faceTracking ? 10 : 70) ) {
            // Ensure x and y is even value
            let visibleRectX = (( newX % 2) === 0) ? newX : (newX + 1);
            let visibleRectY = (( newY % 2) === 0) ? newY : (newY + 1);
            // Ensure visibleRectWidth and visibleRectHeight fall within videoWidth and videoHeight
            let visibleRectWidth = (visibleRectX + newWidth) > videoInfo.width ? (videoInfo.width -  visibleRectX) : newWidth
            let visibleRectHeight = (visibleRectY + newHeight) > videoInfo.height ? (videoInfo.height -  visibleRectY) : newHeight
            visibleRectDimension= {
            visibleRectX,
            visibleRectY,
            visibleRectWidth,
            visibleRectHeight
            }
        }
        if (!faceTracking || !visibleRectDimension) visibleRectDimensionState = visibleRectDimension;
        if (faceTracking) {
              frameMovingSteps= {
                  x: Math.max(Math.floor(Math.abs(visibleRectDimensionState.visibleRectX - visibleRectDimension.visibleRectX)/(videoInfo.frameRate/4)), 1),
                  y: Math.max(Math.floor(Math.abs(visibleRectDimensionState.visibleRectY - visibleRectDimension.visibleRectY)/(videoInfo.frameRate/4)),1),
                  width: Math.max(Math.floor(Math.abs(visibleRectDimensionState.visibleRectWidth - visibleRectDimension.visibleRectWidth)/(videoInfo.frameRate/4)),1),
                  height: Math.max(Math.floor(Math.abs(visibleRectDimensionState.visibleRectHeight - visibleRectDimension.visibleRectHeight)/(videoInfo.frameRate/4)),1)
              }
        }
    }

    /********************
     * Brightness Detection
     *******************/
    async function detectBrightness(){  
      let imageData = brightnessCanvasCtx.getImageData(0,0,brightnessCanvas.width,brightnessCanvas.height);
      let data = imageData.data;
      let r,g,b, max_rgb;
      let light = 0, dark = 0;
      let fuzz = -0.15; // accept lighter image

      for(var x = 0, len = data.length; x < len; x+=4) {
        r = data[x];
        g = data[x+1];
        b = data[x+2];  
        max_rgb = Math.max(Math.max(r, g), b);
        if (max_rgb < 128)
            dark++;
        else
            light++;
      }

      let dl_diff = (light - dark) / (brightnessCanvas.width*brightnessCanvas.height);

      switch(true) {
        case (dl_diff + fuzz < -0.8):
          brightnessFactor = 1
          break;
        case (dl_diff + fuzz < -0.5):
          brightnessFactor = 0.8
          break;
        case (dl_diff + fuzz < -0.2):
          brightnessFactor = 0.6
          break;
        case (dl_diff + fuzz < 0):
          brightnessFactor = 0.4
          break;
        case (dl_diff + fuzz < 0.2):
          brightnessFactor = 0.2
          break;
        default:
          brightnessFactor = null
      }
    }

    /********************
     * Worker Listeners
    *******************/
    onmessage = async (event) => {
        const {operation} = event.data;
        if (operation === 'init'){
          const {metaData} = event.data;
          ({padding, videoInfo, brightnessLevel} = event.data);
          if(typeof metaData === 'string'){
            setVonageMetadata(JSON.parse(metaData))
          }
          createMediaProcessor().then( () => {
            const msg = {callbackType: 'success', message: operation}
            postMessage(JSON.stringify(msg));
          }).catch(e=> {
            const msg = {callbackType: 'error', message: operation, error: getErrorMessage(e)}
            postMessage(JSON.stringify(msg));
          })
        } else if (operation === 'transform') {
          const {readable, writable} = event.data;
          mediaProcessor.transform(readable, writable).then(() => {
            const msg = {callbackType: 'success', message: operation}
            postMessage(JSON.stringify(msg));
          })
          .catch(e => {
            const msg = {callbackType: 'error', message: operation, error: getErrorMessage(e)}
            postMessage(JSON.stringify(msg));
          })
        }
        else if (operation === 'updateAdjustBrightnessState') {
          ({enableAdjustBrightness} = event.data)
        }
        else if (operation === 'updateAutoBrightnessState') {
          ({enableAutoBrightness} = event.data)
          if (enableAutoBrightness) {
            brightnessLevel = event.data.brightnessLevel
          }
        }
        else if (operation === 'updateAutoZoomState') {
          ({enableAutoZoom} = event.data)
        }
        else if (operation === 'updatePadding') {
          ({padding} = event.data)
          calculateDimensions(true);
        }
        else if (operation === 'updateFixedRatio') {
          ({fixedRatio} = event.data)
          calculateDimensions(true);
        }
        else if (operation === 'updateFaceTracking') {
          ({faceTracking} = event.data)
          calculateDimensions(true);
        }
        else if (operation === 'updateBrightnessLevel') {
          ({brightnessLevel} = event.data)
        }
        else if (operation === 'faceDetectionResult') {
            const {result} = event.data;
            faceDimension = {
                width: result.width,
                height: result.height,
                xCenter: result.xCenter,
                yCenter: result.yCenter
            }
            calculateDimensions();
        }
      };
}
