
class WebGPU {
    meshes = []
    shaders = `
        @group(0) @binding(0) var<uniform> uView: mat4x4<f32>;
        @group(0) @binding(1) var<uniform> uModel: mat4x4<f32>;
        @group(0) @binding(2) var uSampler: sampler;
        @group(0) @binding(3) var uTexture: texture_2d<f32>;
        @group(0) @binding(4) var<uniform> useTexture: u32;

        struct VertexOut {
        @builtin(position) position : vec4f,
        @location(0) color : vec4f,
        @location(1) uv : vec2f
        }

        @vertex
        fn vertex_main(@location(0) position: vec4f,
                    @location(1) color: vec4f, @location(2) uv: vec2f) -> VertexOut
        {
            var output : VertexOut;
            output.position = uView * uModel * vec4<f32>(position.xyz, 1.0);
            output.color = color;
            output.uv = uv;
            return output;
        }

        

        @fragment
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
        {
            var color = fragData.color;
            if (useTexture != 0u) {
                color = textureSample(uTexture, uSampler, fragData.uv);
            }
            return color;
        }
    `
    uniforms = {
        view: [null, 0, 16*4, 0, true],
        model: [null, 1, 16*4, 0, false],
        sampler: [null, 2, 0, 1, false, true, {sampler: {type: "non-filtering"}}],
        texture: [null, 3, 0, 1, false, true, {texture: {sampleType: "float"}}],
        useTexture: [null, 4, 4, 1, false]
    }
    vertexConfig = {
        entryPoint: "vertex_main",
        buffers: [
            {
                arrayStride: 9 * 4,
                attributes: [
                    {
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    },
                    {
                        shaderLocation: 1,
                        offset: 4 * 3,
                        format: "float32x4"
                    },
                    {
                        shaderLocation: 2,
                        offset: 4 * 7,
                        format: "float32x2"
                    }
                ]
            }
        ]
    }
    fragmentConfig = {
        entryPoint: "fragment_main",
    }
    samplers = []
    meshes = []
    textures = []
    cUseTexture = null 
    ready = false
    async setup(id="gpucanvas") {
        window.gpucanvas = document.getElementById(id)
        
        if (!navigator.gpu) {
            throw Error("WebGPU not supported.")
        }

        this.adapter = await navigator.gpu.requestAdapter()
        if (!this.adapter) {
            throw Error('Couldn\'t request WebGPU adapter.')
        }
    
        window.device = await this.adapter.requestDevice()
    
        this.shaderModule = device.createShaderModule({
            code: this.shaders
        })

        window.gpuctx = gpucanvas.getContext("webgpu")
        
        gpuctx.configure({
            device: device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied"
        })

        for (let i = 0; i < 4; i++) {
            this.samplers.push(device.createSampler({
                addressModeU: (i & 1) ? "repeat" : "clamp-to-edge",
                addressModeV: (i & 1) ? "repeat" : "clamp-to-edge",
                magFilter: (i & 2) ? "linear" : "nearest",
                minFilter: (i & 2) ? "linear" : "nearest"
            }))
        }

        this.dTexture = device.createTexture({
            format: "rgba8unorm",
            size: [1, 1],
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        })

        var layout = {entries: []}

        for (let name in this.uniforms) {
            if (this.uniforms[name][4]) {
                this.uniforms[name][0] = device.createBuffer({
                    size: this.uniforms[name][2],
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                })
            }
            let entry = {
                binding: this.uniforms[name][1],
                visibility: this.uniforms[name][3] == 0 ? GPUShaderStage.VERTEX : GPUShaderStage.FRAGMENT,
            }
           
            if (this.uniforms[name][6]) {
                entry = {...entry, ...this.uniforms[name][6]}
            } else {
                entry.buffer = { type: "uniform" }
            }
            layout.entries.push(entry)
        }

        this.bindGroupLayout = device.createBindGroupLayout(layout)

        for (let texture of this.textures) {
            texture.init(texture.src)
        }

        this.pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout]
        })

        var pipelineFormat = {
            layout: this.pipelineLayout, 
            primitive: {
                topology: "triangle-list",
            },
            vertex: {
                module: this.shaderModule,
                ...this.vertexConfig
            },
            fragment: {
                module: this.shaderModule,
                ...this.fragmentConfig,
                targets: [
                    {format: navigator.gpu.getPreferredCanvasFormat()}
                ]
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus",
            },
        }

        this.pipeline = device.createRenderPipeline(pipelineFormat)
        pipelineFormat.primitive.cullMode = "back"
        pipelineFormat.primitive.frontFace = "ccw"
        this.cullPipeline = device.createRenderPipeline(pipelineFormat)

        for (let mesh of this.meshes) {
            if (mesh.texture && mesh.texture.loaded) {
                mesh.createBindGroup(this.bindGroupLayout, [this.samplers[mesh.sampler], mesh.texture.texture.createView()])
            } else {
                mesh.createBindGroup(this.bindGroupLayout, [this.samplers[0], this.dTexture.createView()])
            }
            mesh.updateBuffers()
        }

        this.ready = true
        this.onReady()
    }
    setStyles() {
        gpucanvas.style.position = "absolute"
        gpucanvas.style.left = 0
        gpucanvas.style.top = 0
        document.body.style.overflow = "hidden"
    }
    onReady() {

    }
    render(background=[0, 0, 0, 1]) {
        this.cUseTexture = null
        var commandEncoder = device.createCommandEncoder()

        var depthTexture = device.createTexture({
            size: [gpucanvas.width, gpucanvas.height],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })

        var renderPassDescriptor = {
        colorAttachments: [{
            clearValue: {r: background[0], g: background[1], b: background[2], a: background[3]},
            loadOp: 'clear',
            storeOp: 'store',
            view: gpuctx.getCurrentTexture().createView()
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
        }
    
        var passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
        
        passEncoder.setPipeline(this.pipeline)
        this.cPipeline = this.pipeline

        for (let mesh of this.meshes) {
            mesh.render(passEncoder)
        }

        passEncoder.end()
  
        device.queue.submit([commandEncoder.finish()])
    }
    get Texture() {
        return class {
            loaded = false
            connected = []
            constructor(src) {
                this.src = src
                webgpu.textures.push(this)
                if (webgpu.ready) {
                    this.init(src)
                }
            }
            async init(src) {
                let img = new Image()
                img.src = src
                await img.decode()

                let canvas = document.createElement("canvas")
                let ctx = canvas.getContext("2d")
                canvas.width = img.width
                canvas.height = img.height
                ctx.drawImage(img, 0, 0)

                let bitmap = await createImageBitmap(canvas)
                this.texture = device.createTexture({
                    format: "rgba8unorm",
                    size: [bitmap.width, bitmap.height],
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
                })
                device.queue.copyExternalImageToTexture(
                    { source: bitmap, flipY: true },
                    { texture: this.texture },
                    { width: bitmap.width, height: bitmap.height },
                )

                this.loaded = true

                if (webgpu.ready) {
                    for (let mesh of this.connected) {
                        mesh.createBindGroup(webgpu.bindGroupLayout, [webgpu.samplers[mesh.sampler], this.texture.createView()])
                    }
                }
            }
        }
    }
    get Mesh() {
        return class {
            uniformsB = {}
            oneSide = false
            texture = null
            useTexture = false
            sampler = 0
            constructor(x, y, z, width, height, depth, vertices=[], faces=[], colours=[]) {
                this.pos = {x: x, y: y, z: z}
                this.size = {x: width, y: height, z: depth}
                this.rot = {x: 0, y: 0, z: 0}
                this.vertices = vertices
                this.colours = colours
                this.faces = faces
                this.uvs = []
                this.shaders = webgpu.shaders
                this.uniforms = webgpu.uniforms
                webgpu.meshes.push(this)
                if (webgpu.ready) {
                    this.createBindGroup(webgpu.bindGroupLayout, [webgpu.samplers[0], webgpu.dTexture])
                    this.updateBuffers()
                }
            }
            setTexture(texture) {
                this.texture = texture
                this.useTexture = true
                texture.connected.push(this)
                if (texture.loaded) {
                    if (webgpu.ready) {
                        this.createBindGroup(webgpu.bindGroupLayout, [webgpu.samplers[this.sampler], this.texture.texture.createView()])
                    }
                }
            }
            delete() {
                if (this.texture) {
                    this.texture.splice(this.texture.indexOf(this), 1)
                }
                webgpu.meshes.splice(webgpu.meshes.indexOf(this), 1)
            }
            createBindGroup(layout, customValues=[]) {
                let bLayout = {layout: layout, entries: []}
                
                for (let name in webgpu.uniforms) {
                    if (!webgpu.uniforms[name][4] && !webgpu.uniforms[name][5]) {
                        this.uniformsB[name] = device.createBuffer({
                            size: webgpu.uniforms[name][2],
                            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                        })
                    }
                }

                let i = 0
                for (let name in this.uniforms) {
                    if (!webgpu.uniforms[name][5]) {
                        bLayout.entries.push({
                            binding: this.uniforms[name][1],
                            resource: {
                                buffer: this.uniforms[name][4] ? this.uniforms[name][0] : this.uniformsB[name]
                            }
                        })
                    } else {
                        bLayout.entries.push({
                            binding: this.uniforms[name][1],
                            resource: customValues[i] ? customValues[i] : null
                        })
                        i++
                    }
                }
                this.bindGroup = device.createBindGroup(bLayout)
            }
            updateBuffers() {
                if (!window.device) return
                let vertexes = []
                for (let i = 0; i < this.vertices.length/3; i++) {
                    vertexes.push(
                        this.vertices[i*3], this.vertices[i*3+1], this.vertices[i*3+2], 
                        this.colours[i*4], this.colours[i*4+1], this.colours[i*4+2], this.colours[i*4+3],
                        this.uvs[i*2], this.uvs[i*2+1]
                    )
                }
                vertexes = new Float32Array(vertexes)
                let indexes = new Uint32Array(this.faces)

                this.vertexBuffer = device.createBuffer({
                    size: vertexes.byteLength,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                })
                device.queue.writeBuffer(this.vertexBuffer, 0, vertexes, 0, vertexes.length)

                this.indexBuffer = device.createBuffer({
                    size: indexes.byteLength,
                    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                })
                device.queue.writeBuffer(this.indexBuffer, 0, indexes, 0, indexes.length)
            }
            render(passEncoder) {
                if (this.texture != null) {
                    if (!this.texture.loaded) return
                }
                let pipeline = this.oneSide ? webgpu.cullPipeline : webgpu.pipeline
                if (webgpu.cPipeline != pipeline) {
                    passEncoder.setPipeline(pipeline)
                    webgpu.cPipeline = pipeline
                }

                passEncoder.setVertexBuffer(0, this.vertexBuffer)
                passEncoder.setIndexBuffer(this.indexBuffer, "uint32")
                
                let modelMatrix = getModelMatrix(this.pos.x, this.pos.y, this.pos.z, this.rot.x, this.rot.y, this.rot.z)

                device.queue.writeBuffer(this.uniformsB.model, 0, modelMatrix, 0, modelMatrix.length)

                if (this.useTexture != webgpu.cUseTexture) {
                    let utBuffer = new Uint32Array([this.useTexture ? 1 : 0])
                    device.queue.writeBuffer(this.uniformsB.useTexture, 0, utBuffer, 0, utBuffer.length)
                    webgpu.cUseTexture = this.useTexture
                }

                passEncoder.setBindGroup(0, this.bindGroup)
            
                passEncoder.drawIndexed(this.faces.length, 1, 0, 0, 0)
            }
        }
    }

    get Box() {
		return class extends webgpu.Mesh {
			lastColour = []
			colour = [0, 0, 0]
			visible = true
			shading = true
			constructor(x, y, z, width, height, depth, colour, centerRot=true) {
				super(x, y, z, width, height, depth, [],[
					// +Z
					16, 17, 18,
					19, 17, 16,
					// -X
					4, 5, 6,
					7, 5, 4,
					// +X
					2, 1, 0,
					0, 1, 3,
					// -Z
					22, 21, 20,
					20, 21, 23,
					// -Y
					14, 13, 12,
					12, 13, 15,
					// +Y
					8, 9, 10,
					11, 9, 8,
				])
				this.oneSide = true
				this.colour = colour
				if (centerRot) {
					this.rotOff = {x: -width/2, y: -height/2, z: -depth/2}
				}
                this.updateShape()
			}
            setUvs(offx=0, offy=0, offw=1, offh=1) {
                this.uvs = []
                for (let i = 0; i < 6; i++) {
                    this.uvs.push(
                        offx+offw, offy+offh,
                        offx, offy,
                        offx, offy+offh,
                        offx+offw, offy,
                    )
                }
                this.updateBuffers()
            }
			updateShape(o=0) {
				this.vertices = [
					// +X
					1-o, 1, 1,
					1-o, 0, 0,
					1-o, 1, 0,
					1-o, 0, 1,
					// -X
					0+o, 1, 1,
					0+o, 0, 0,
					0+o, 1, 0,
					0+o, 0, 1,
					// +Y
					1, 1-o, 1,
					0, 1-o, 0,
					1, 1-o, 0,
					0, 1-o, 1,
					// -Y
					1, 0+o, 1,
					0, 0+o, 0,
					1, 0+o, 0,
					0, 0+o, 1,
					// +Z
					1, 1, 0+o,
					0, 0, 0+o,
					1, 0, 0+o,
					0, 1, 0+o,
					// -Z
					1, 1, 1-o,
					0, 0, 1-o,
					1, 0, 1-o,
					0, 1, 1-o,
				]
                this.updateBuffers()
			}
			render(passEncoder) {
				if (!this.visible) { return }
				if (JSON.stringify(this.colour) != JSON.stringify(this.lastColour)) {
					this.colours = []
					if (this.shading) {
						// +X
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.85, this.colour[1]*0.85, this.colour[2]*0.85, 1)
						}
						// -X
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.7, this.colour[1]*0.7, this.colour[2]*0.7, 1)
						}
						// +Y
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*1, this.colour[1]*1, this.colour[2]*1, 1)
						}
						// -Y
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.55, this.colour[1]*0.55, this.colour[2]*0.55, 1)
						}
						// +Z
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.75, this.colour[1]*0.75, this.colour[2]*0.75, 1)
						}
						// -Z
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.6, this.colour[1]*0.6, this.colour[2]*0.6, 1)
						}
					} else {
						for (let i = 0; i < 4*6; i++) {
							this.colours.push(this.colour[0]*1, this.colour[1]*1, this.colour[2]*1, 1)
						}
					}
					
					this.updateBuffers()
				}
				this.lastColour = [...this.colour]
				this.pos.x -= this.size.x/2
				this.pos.y -= this.size.y/2
				this.pos.z -= this.size.z/2
				super.render(passEncoder)
				this.pos.x += this.size.x/2
				this.pos.y += this.size.y/2
				this.pos.z += this.size.z/2
			}
		}
	}
}

var webgpu = new WebGPU()