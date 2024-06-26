
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

function getModelMatrix(x, y, z, rotx, roty, rotz) {
    let model = mat4.create()

    mat4.translate(model, model, [x, y, -z])
    mat4.rotateY(model, model, -roty)
    mat4.rotateX(model, model, -rotx)
    mat4.rotateZ(model, model, -rotz)

    mat4.scale(model, model, [1, 1, -1])

    // mat4.invert(model, model)

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
            x*grassSize, 5*grassSize, z*grassSize,
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
        for (let i = 0; i < 3; i++) grassIds.push((x*gridSize + z) / gridSize / gridSize)
    }
}
grass.customBuffers = [[1, grassIds]]
grass.setShader("grass", grassShaders, grassUniforms, grassVertexConfig, grass.fragmentConfig)
grass.updateBuffers()


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
])

var coolBox = new webgpu.Box(0, 0, -3, 1, 1, 1, [1, 1, 1])
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
])
ground.oneSide = true

var ttest1 = new webgpu.Box(-2, 1, 4, 1, 1, 1, [1, 1, 1, 1])
var ttest2 = new webgpu.Box(0, 1, 4, 1, 1, 1, [0, 1, 0, 1])
var ttest3 = new webgpu.Box(2, 1, 4, 1, 1, 1, [0, 0, 1, 1])

ttest1.oneSide = false
ttest2.oneSide = false
ttest3.oneSide = false

ttest1.setTexture(edges)
ttest1.setUvs()

var delta = 0
var lastTime = 0
var su = 0

var time = 0

var speed = 0.3

var viewProjection

function frame(timestamp) {

    utils.getDelta(timestamp)
    ui.resizeCanvas()
    ui.getSu()
    input.setGlobals()

    time += delta

    gpucanvas.width = window.innerWidth
    gpucanvas.height = window.innerHeight

    if (keys["KeyW"]) {
        vel.x += Math.sin(camera.rot.y)*speed*delta
        vel.z += Math.cos(camera.rot.y)*speed*delta
    }
    if (keys["KeyS"]) {
        vel.x -= Math.sin(camera.rot.y)*speed*delta
        vel.z -= Math.cos(camera.rot.y)*speed*delta
    }
    if (keys["KeyA"]) {
        vel.x -= Math.cos(camera.rot.y)*speed*delta
        vel.z += Math.sin(camera.rot.y)*speed*delta
    }
    if (keys["KeyD"]) {
        vel.x += Math.cos(camera.rot.y)*speed*delta
        vel.z -= Math.sin(camera.rot.y)*speed*delta
    }
    if (keys["Space"]) {
        vel.y += speed*delta
    }
    if (keys["ShiftLeft"]) {
        vel.y -= speed*delta
    }

    vel.x = lerp(vel.x, 0, delta*100*0.1)
    vel.y = lerp(vel.y, 0, delta*100*0.1)
    vel.z = lerp(vel.z, 0, delta*100*0.1)

    camera.pos.x += vel.x
    camera.pos.y += vel.y
    camera.pos.z += vel.z

    if (mouse.lclick) {
        input.lockMouse()
    }

    viewProjection = getViewMatrix()
    
    test2.rot.y = time

    webgpu.setGlobalUniform("view", viewProjection[1])
    webgpu.setGlobalUniform("projection", viewProjection[0])

    let timeBuffer = new Float32Array([time])
    device.queue.writeBuffer(webgpu.shaders.grass.uniforms.time[0], 0, timeBuffer, 0, timeBuffer.length)

    let cameraBuffer = new Float32Array([camera.pos.x, camera.pos.y, camera.pos.z])
    device.queue.writeBuffer(webgpu.shaders.grass.uniforms.camera[0], 0, cameraBuffer, 0, cameraBuffer.length)

    webgpu.render([0.4, 0.8, 1, 1])

    input.updateInput()

    requestAnimationFrame(frame)
}

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