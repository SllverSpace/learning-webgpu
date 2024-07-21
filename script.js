
utils.setup()
utils.setStyles()
utils.setGlobals()

var fov = 60
var camera = {pos: {x: 0, y: 1, z: 0}, rot: {x: 0, y: 0, z: 0}}
var vel = {x: 0, y: 0, z: 0}

function getViewMatrix() {
    let view = mat4.create()
    let projection = mat4.create()
    mat4.perspective(projection, fov * Math.PI / 180, gpucanvas.width / gpucanvas.height, 0.01, 5000)

    mat4.translate(view, view, [camera.pos.x, camera.pos.y, -camera.pos.z])
    mat4.rotateY(view, view, -camera.rot.y)
    mat4.rotateX(view, view, -camera.rot.x)
    mat4.rotateZ(view, view, -camera.rot.z)
    mat4.invert(view, view)

    return [projection, view]
}

function getModelMatrix(x, y, z, rotx, roty, rotz, scalex, scaley, scalez) {
    let model = mat4.create()

    mat4.translate(model, model, [x, y, -z])
    mat4.rotateY(model, model, -roty)
    mat4.rotateX(model, model, -rotx)
    mat4.rotateZ(model, model, -rotz)

    mat4.scale(model, model, [scalex, scaley, -scalez])

    // mat4.invert(model, model)

    return model
}

function getNormalMatrix(rotx, roty, rotz, scalex, scaley, scalez) {
    let model = mat4.create()

    mat4.rotateY(model, model, -roty)
    mat4.rotateX(model, model, -rotx)
    mat4.rotateZ(model, model, -rotz)

    mat4.scale(model, model, [scalex, scaley, scalez])

    let normalMatrix = mat4.create()
    mat4.invert(normalMatrix, model)
    mat4.transpose(normalMatrix, normalMatrix)
    
    return model
}

webgpu.onReady = () => {requestAnimationFrame(frame)}

webgpu.setup()
webgpu.setStyles()

var coolCube = new webgpu.Texture("cool-cube.png")
var edges = new webgpu.Texture("edges-2.png")

var grid = []

var gridSize = 300
let grassSize = 20/gridSize
var grass = new webgpu.Mesh(-10, -0.5, -10, 1, 1, 1, [], [], [])
var grassIds = []
for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
        grass.vertices.push(
            x*grassSize, 7.5*grassSize, z*grassSize,
            0*grassSize + x*grassSize, 0, z*grassSize,
            0*grassSize + x*grassSize, 0, z*grassSize
        )
        grass.faces.push(
            grass.vertices.length/3-3,
            grass.vertices.length/3-2,
            grass.vertices.length/3-1
        )
        grass.colours.push(
            0, 1, 0, 1,
            0, 0.5, 0, 1,
            0, 0.5, 0, 1
        )
        grass.normals.push(
            0, 1, 0,
            0, 1, 0,
            0, 1, 0
        )
        for (let i = 0; i < 3; i++) grassIds.push((x*gridSize + z) / gridSize / gridSize)
    }
}
grass.customBuffers = [[1, grassIds]]
grass.setShader("grass", grassShaders, grassUniforms, grassVertexConfig, grass.fragmentConfig, grass.pipelineConfig)
grass.updateBuffers()
grass.material.ambient = [0.8, 0.8, 0.8]
grass.material.diffuse = [0.2, 0.2, 0.2]
grass.material.specular = [0, 0, 0]


var test2 = new webgpu.Mesh(-3, 0, 0, 1, 1, 1, [
    0, 1, 0,
    0, 0, 0,
    1, 0, 0
],[
    0, 1, 2
],[
    1, 0, 0, 1,
    0, 1, 0, 1,
    0, 0, 1, 1
],[
    0, 0, 1,
    0, 0, 1,
    0, 0, 1
])

var coolBox = new webgpu.Box(0, 0, -3, 1, 1, 1, [1, 1, 1, 1])
coolBox.setTexture(coolCube)
coolBox.setUvs()

var ground = new webgpu.Mesh(0, -0.5, 0, 1, 1, 1, [
    -10, 0, -10,
    10, 0, 10,
    -10, 0, 10,
    10, 0, -10
],[
    0, 3, 1,
    0, 1, 2
],[
    0, 0.5, 0, 1,
    0, 0.5, 0, 1,
    0, 0.5, 0, 1,
    0, 0.5, 0, 1
],[
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0
])
ground.oneSide = true

var ttest1 = new webgpu.Box(-2, 1, 4, 1, 1, 1, [1, 1, 1, 0.5])
var ttest2 = new webgpu.Box(0, 1, 4, 1, 1, 1, [0, 1, 0, 0.5])
var ttest3 = new webgpu.Box(2, 1, 4, 1, 1, 1, [0, 0, 1, 0.5])
ttest1.transparent = true
ttest2.transparent = true
ttest3.transparent = true

ttest1.oneSide = false
ttest2.oneSide = false
ttest3.oneSide = false
ttest1.setTMat()
ttest2.setTMat()
ttest3.setTMat()

ttest1.setTexture(edges)
ttest1.setUvs()

var houseAlpha = 1

var house = [
    new webgpu.Box(7.5, 0.5, 0, 5, 0.1, 5, [0.6, 0.5, 0, houseAlpha]),
    new webgpu.Box(5+0.15, 0, -2.35, 0.2, 1, 0.2, [0.5, 0.4, 0, houseAlpha]),
    new webgpu.Box(10-0.15, 0, -2.35, 0.2, 1, 0.2, [0.5, 0.4, 0, houseAlpha]),
    new webgpu.Box(5+0.15, 0, 2.35, 0.2, 1, 0.2, [0.5, 0.4, 0, houseAlpha]),
    new webgpu.Box(10-0.15, 0, 2.35, 0.2, 1, 0.2, [0.5, 0.4, 0, houseAlpha]),

    new webgpu.Box(10, 2, 0, 0.1, 3, 5, [0.6, 0.5, 0, houseAlpha]),
    new webgpu.Box(7.5, 2, 2.5, 5, 3, 0.1, [0.6, 0.5, 0, houseAlpha]),
    new webgpu.Box(7.5, 2, -2.5, 5, 3, 0.1, [0.6, 0.5, 0, houseAlpha]),
    new webgpu.Box(5, 2, -1.5, 0.1, 3, 2, [0.6, 0.5, 0, houseAlpha]),
    new webgpu.Box(5, 2, 1.5, 0.1, 3, 2, [0.6, 0.5, 0, houseAlpha]),
    new webgpu.Box(5, 3, 0, 0.1, 1, 1, [0.6, 0.5, 0, houseAlpha]),
    new webgpu.Box(7.5, 3.5, 0, 5, 0.1, 5, [0.6, 0.5, 0, houseAlpha]),

    new webgpu.Box(4.5, 0, 0, 1, 0.1, 1.5, [0.6, 0.5, 0, houseAlpha]),
]
if (houseAlpha < 1) {
    for (let mesh of house) {
        mesh.transparent = true
        mesh.oneSide = false
    }
}

var line = new webgpu.Mesh(-10, 1, -7.5, 1, 1, 1, [], [], [])
for (let i = 0; i < 20; i++) {
    line.vertices.push(
        i, 0, 0,
        i, 0, 1,
        i, 1, 0,
        i, 1, 1
    )
    line.faces.push(
        i*4, i*4+1, i*4+3,
        i*4, i*4+2, i*4+3
    )
    let c = hslToRgb((i / 20) * 360, 100, 50, 0.5)
    c[0] /= 255; c[1] /= 255; c[2] /= 255
    line.colours.push(
        ...c, ...c, ...c, ...c
    )
    line.normals.push(
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0
    )
}
line.transparent = true
line.updateBuffers()


var line2 = new webgpu.Mesh(-25, 1, -12.5, 1, 1, 1, [], [], [])
for (let i = 0; i < 50; i++) {
    line2.vertices.push(
        i, 0, 0,
        i, 0, 1,
        i, 1, 0,
        i, 1, 1
    )
    line2.faces.push(
        i*4, i*4+1, i*4+3,
        i*4, i*4+2, i*4+3
    )
    let c = hslToRgb((i / 50) * 360, 100, 50, 0.5)
    c[0] /= 255; c[1] /= 255; c[2] /= 255
    line2.colours.push(
        ...c, ...c, ...c, ...c
    )
    line2.normals.push(
        -1, 0, 0,
        -1, 0, 0,
        -1, 0, 0
    )
}
line2.transparent = true
line2.updateBuffers()

line.setTMat()
line2.setTMat()

house[12].rot.y = Math.PI/2
house[12].rot.x = -Math.PI/4

var delta = 0
var lastTime = 0
var su = 0

var time = 0

var speed = 30

var viewProjection

var cpuTimes = []
var gpuTimes = []

var lightPos = {x: 0, y: 0, z: 0}

var fps = 0
var fps2 = 0

var player = new Player(0, 1, 0)

var lightSphere = new webgpu.Sphere(0, 0, 0, 0.25, [1, 1, 1], 10)
lightSphere.material.ambient = [1, 1, 1]

let spheres = []

for (let layer = 0; layer < 3; layer++) {
    for (let sphere = 0; sphere < 5; sphere++) {
        let angle = Math.PI*2 / 5 * sphere

        let id = layer*5 + sphere

        let c = hslToRgb((id / (3*5)) * 360, 100, 50, 0.5)
        c[0] /= 255; c[1] /= 255; c[2] /= 255

        let coolSphere = new webgpu.Sphere(-7.5 + Math.sin(angle)*1.1, 1+layer, 5 + Math.cos(angle)*1.1, 0.75, c, 20)
        coolSphere.transparent = true
        coolSphere.oneSide = false
        coolSphere.setTMat()
        spheres.push(coolSphere)
    }
}

var showSpheres = false


function frame(timestamp) {
    let start = performance.now()
    fps++

    utils.getDelta(timestamp)
    ui.resizeCanvas()
    ui.getSu()
    input.setGlobals()

    time += delta

    webgpu.resizeCanvas()

    player.tick()

    if (jKeys["KeyF"]) {
        webgpu.dualDepthPeeling = !webgpu.dualDepthPeeling
    }

    if (jKeys["KeyE"]) {
        webgpu.depthLayers += 1
    }
    if (jKeys["KeyQ"]) {
        webgpu.depthLayers -= 1
    }

    if (jKeys["KeyR"]) {
        showSpheres = !showSpheres
    }

    for (let sphere of spheres) {
        sphere.visible = showSpheres
    }

    if (mouse.lclick) {
        input.lockMouse()
    }

    viewProjection = getViewMatrix()
    
    test2.rot.y = time

    ttest3.rot.y = time

    ttest2.colour[3] = Math.sin(time) / 2 + 0.5

    lightPos = {x: Math.sin(time/2) * 7.5, y: 10, z: Math.cos(time/2) * 7.5}
    lightSphere.pos = lightPos

    let lightBuffer = new Float32Array([lightPos.x, lightPos.y, lightPos.z, 0, 1, 1, 1])
    let cameraBuffer = new Float32Array([camera.pos.x, camera.pos.y, camera.pos.z])

    webgpu.setGlobalUniform("view", viewProjection[1])
    webgpu.setGlobalUniform("projection", viewProjection[0])
    webgpu.setGlobalUniform("camera", cameraBuffer)
    webgpu.setGlobalUniform("light", lightBuffer)

    let timeBuffer = new Float32Array([time])
    device.queue.writeBuffer(webgpu.shaders.grass.uniforms.time[0], 0, timeBuffer, 0, timeBuffer.length)

    webgpu.render([0.4, 0.8, 1, 1])

    cpuTimes.push(performance.now()-start)
    if (cpuTimes.length > 500) cpuTimes.splice(0, 1)

    let cpuAvg = 0
    for (let time of cpuTimes) {
        cpuAvg += time
    }
    cpuAvg /= cpuTimes.length

    let gpuAvg = 0
    for (let time of webgpu.gpuTimes) {
        gpuAvg += time
    }
    gpuAvg /= webgpu.gpuTimes.length

    ui.text(10*su, 15*su, 20*su, `${Math.round(cpuAvg*10)/10}ms CPU (${Math.round(1000/cpuAvg)} FPS) \nAnimation FPS: ${fps2} \n \n${webgpu.dualDepthPeeling ? "Dual Depth Peeling - Faster on high end devices" : "Depth Peeling - Faster on low to mid range devices"} \nRendering Passes: ${webgpu.renderingDepthLayers} \nMax Depth Layers: ${webgpu.depthLayers * 2} \n \nControls: \nQ/E - Change Depth Layers \nF - Change Rendering Mode \nR - Show/Hide Spheres`)

    input.updateInput()

    requestAnimationFrame(frame)
}

setInterval(() => {
    fps2 = fps
    fps = 0
}, 1000)

var sensitivity = 0.002

input.mouseMove = (event) => {
    input.mouse.x = event.clientX/ui.scale
    input.mouse.y = event.clientY/ui.scale

    if (input.isMouseLocked()) {
        camera.rot.x += event.movementY*sensitivity
		if (camera.rot.x > Math.PI/2*0.99) {
			camera.rot.x = Math.PI/2*0.99
		}
		if (camera.rot.x < -Math.PI/2*0.99) {
			camera.rot.x = -Math.PI/2*0.99
		}

        camera.rot.y += event.movementX * sensitivity
    }
}