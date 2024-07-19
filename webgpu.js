
class WebGPU {
    meshes = []
    debugShaders = `

        @group(0) @binding(0) var uTexture: texture_2d<f32>;
        @group(0) @binding(1) var<storage, read> uStorage: array<u32>;

        struct VertexOut {
            @builtin(position) position : vec4f,
        }

        @vertex
        fn vertex_main(@builtin(vertex_index) vertIndex: u32) -> VertexOut {
            const position = array<vec2f, 6>(
                vec2(-1.0, -1.0),
                vec2(1.0, -1.0),
                vec2(1.0, 1.0),
                vec2(-1.0, -1.0),
                vec2(1.0, 1.0),
                vec2(-1.0, 1.0),
            );
            
            var output : VertexOut;
            output.position = vec4(position[vertIndex], 0.0, 1.0);
            return output;
        }

        @fragment
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
        {
            let fragCoord = fragData.position;
            let fragCoords = vec2i(fragCoord.xy);

            let index = u32(fragCoords.x) * textureDimensions(uTexture).y + u32(fragCoords.y);
            let value1 = (1 - bitcast<f32>(uStorage[index * 2])) * 100 - 99;
            let value2 = bitcast<f32>(uStorage[index * 2 + 1]) * 100 - 99;

            let colour = textureLoad(uTexture, fragCoords, 0);

            return vec4f(colour.r, colour.g, colour.b, 1.0);
            // return vec4f(value1, value2, 0, 1);
        }
    `
    debugUniforms = {
        texture: [null, 0, 0, 1, false, true, {texture: {sampleType: "float"}}],
        storage: [null, 1, 0, 1, true, false, {buffer: {type: "read-only-storage"}}],
    }
    dShaders = `
        @group(0) @binding(0) var<uniform> uView: mat4x4<f32>;
        @group(0) @binding(1) var<uniform> uProjection: mat4x4<f32>;
        @group(0) @binding(2) var<uniform> uModel: mat4x4<f32>;
        @group(0) @binding(3) var uSampler: sampler;
        @group(0) @binding(4) var uTexture: texture_2d<f32>;
        @group(0) @binding(5) var<uniform> useTexture: u32;

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
            output.position = uProjection * uView * uModel * vec4<f32>(position.xyz, 1.0);
            output.color = color;
            output.uv = uv;
            return output;
        }

        

        @fragment
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
        {
            var color = fragData.color;
            if (useTexture != 0u) {
                color = textureSample(uTexture, uSampler, fragData.uv) * fragData.color;
            }
            return color;
        }
    `
    dShaderName = "default"
    dUniforms = {
        view: [null, 0, 16*4, 0, true],
        projection: [null, 1, 16*4, 0, true],
        model: [null, 2, 16*4, 0, false],
        sampler: [null, 3, 0, 1, false, true, {sampler: {type: "non-filtering"}}],
        texture: [null, 4, 0, 1, false, true, {texture: {sampleType: "float"}}],
        useTexture: [null, 5, 4, 1, false]
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
    dPipelineConfig = {
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: "less",
            format: "depth24plus",
        }
    }
    fragmentConfig = {
        entryPoint: "fragment_main",
        targets: [
            {format: "bgra8unorm"}
        ]
    }
    tTop = `
        @group(0) @binding(0) var<uniform> uView: mat4x4<f32>;
        @group(0) @binding(1) var<uniform> uProjection: mat4x4<f32>;
        @group(0) @binding(2) var<uniform> uModel: mat4x4<f32>;
        @group(0) @binding(3) var uSampler: sampler;
        @group(0) @binding(4) var uTexture: texture_2d<f32>;
        @group(0) @binding(5) var<uniform> useTexture: u32;
    `
    tVertex = `
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
            output.position = uProjection * uView * uModel * vec4<f32>(position.xyz, 1.0);
            output.color = color;
            output.uv = uv;
            return output;
        }
    `
    tFragment = `
        var color = fragData.color;
        if useTexture != 0u {
            color = textureSample(uTexture, uSampler, fragData.uv) * fragData.color;
        }
    `
    tUniforms = {
        view: [null, 0, 16*4, 0, true],
        projection: [null, 1, 16*4, 0, true],
        model: [null, 2, 16*4, 0, false],
        sampler: [null, 3, 0, 1, false, true, {sampler: {type: "non-filtering"}}],
        texture: [null, 4, 0, 1, false, true, {texture: {sampleType: "float"}}],
        useTexture: [null, 5, 4, 1, false],
    }
    tdShaders = `
        struct FragmentOutput {
            @location(0) frontColour: vec4f,
            @location(1) backColour: vec4f
        }

        @group(0) @binding(0) var<uniform> uView: mat4x4<f32>;
        @group(0) @binding(1) var<uniform> uProjection: mat4x4<f32>;
        @group(0) @binding(2) var<uniform> uModel: mat4x4<f32>;
        @group(0) @binding(3) var uSampler: sampler;
        @group(0) @binding(4) var uTexture: texture_2d<f32>;
        @group(0) @binding(5) var<uniform> useTexture: u32;
       
        @binding(6) @group(0) var solidDepthTexture: texture_depth_2d;
        @binding(7) @group(0) var<storage, read> readDepths: array<u32>;
        @binding(8) @group(0) var<storage, read_write> writeDepths: array<atomic<u32>>;
        @binding(9) @group(0) var<storage, read_write> drawn: array<u32>;
        @binding(10) @group(0) var<uniform> drawnIndex: u32;

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
            output.position = uProjection * uView * uModel * vec4<f32>(position.xyz, 1.0);
            output.color = color;
            output.uv = uv;
            return output;
        }

        fn decodeDepth(encodedDepth: f32) -> f32 {
            let near = 0.1;
            let far = 5000.0;
            let c = pow(2.0, (1.0 - encodedDepth) * log2(far / near));
            return (far + near - (2.0 * near) / c) / (far - near);
        }

        @fragment
        fn fragment_main(fragData: VertexOut) -> FragmentOutput
        {
            let fragCoord = fragData.position;
            let fragCoords = vec2i(fragCoord.xy);

            let index = u32(fragCoords.x) * textureDimensions(solidDepthTexture).y + u32(fragCoords.y);

            let fragDepth = fragCoord.z;

            let solidDepth = textureLoad(solidDepthTexture, fragCoords, 0);

            var output: FragmentOutput;

            var oDepth = vec2f(0);

            output.frontColour = vec4f(0);

            output.backColour = vec4f(0);

            let nearestDepth = 1 - bitcast<f32>(readDepths[index*2]);
            let furthestDepth = bitcast<f32>(readDepths[index*2+1]);

            if fragCoord.z >= solidDepth {
                discard;
            }

            if fragCoord.z <= 0.5 {
                discard;
            }

            var color = fragData.color;
            if useTexture != 0u {
                color = textureSample(uTexture, uSampler, fragData.uv) * fragData.color;
            }

            if fragDepth < nearestDepth || fragDepth > furthestDepth {
                return output;
            }

            // output.frontColour = vec4f(1, 0, 0, 1);

            if fragDepth > nearestDepth && fragDepth < furthestDepth {
                oDepth = vec2f(1 - fragDepth, fragDepth);
                atomicMax(&writeDepths[index*2], bitcast<u32>(oDepth.x));
                atomicMax(&writeDepths[index*2+1], bitcast<u32>(oDepth.y));
                return output;
            }
            
            if (fragDepth == nearestDepth) {
                output.frontColour = vec4f(color.rgb * color.a, color.a);
            } else {
                output.backColour = vec4f(color.rgb * color.a, color.a);
            }

            drawn[drawnIndex] = 1;

            return output;
        }
    `
    tdUniforms = {
        view: [null, 0, 16*4, 0, true],
        projection: [null, 1, 16*4, 0, true],
        model: [null, 2, 16*4, 0, false],
        sampler: [null, 3, 0, 1, false, true, {sampler: {type: "non-filtering"}}],
        texture: [null, 4, 0, 1, false, true, {texture: {sampleType: "float"}}],
        useTexture: [null, 5, 4, 1, false],
        solidDepthTexture: [null, 6, 0, 1, true, true, {texture: {sampleType: "depth"}}],
        readDepths: [null, 7, 0, 1, true, false, {buffer: {type: "read-only-storage"}}],
        writeDepths: [null, 8, 0, 1, true, false, {buffer: {type: "storage"}}],
        drawn: [null, 9, 0, 1, true, false, {buffer: {type: "storage"}}],
        drawnIndex: [null, 10, 4, 1, true]
    }
    tFragmentConfig = {
        entryPoint: "fragment_main",
        targets: [
            {format: "r32float", writeMask: GPUColorWrite.RED},
            {format: "rgba8unorm", writeMask: GPUColorWrite.ALL}
        ]
    }
    tdFragmentConfig = {
        entryPoint: "fragment_main",
        targets: [
            {format: "rgba8unorm", blend: {color: {srcFactor: "one", dstFactor: "one", operation: "max"}, alpha: {srcFactor: "one", dstFactor: "one", operation: "max"}}},
            {format: "rgba8unorm", blend: {color: {srcFactor: "one", dstFactor: "one", operation: "max"}, alpha: {srcFactor: "one", dstFactor: "one", operation: "max"}}}
        ]
    }
    bShaders = `
        @binding(0) @group(0) var backTexture: texture_2d<f32>;
        @binding(1) @group(0) var frontTexture: texture_2d<f32>;

        @vertex
        fn vertex_main(@builtin(vertex_index) vertIndex: u32) -> @builtin(position) vec4f {
            const position = array<vec2f, 6>(
                vec2(-1.0, -1.0),
                vec2(1.0, -1.0),
                vec2(1.0, 1.0),
                vec2(-1.0, -1.0),
                vec2(1.0, 1.0),
                vec2(-1.0, 1.0),
            );
            
            return vec4(position[vertIndex], 0.0, 1.0);
        }

        fn blend(backColour: vec4f, frontColour: vec4f) -> vec4f {
            let blendedRGB = frontColour.rgb + backColour.rgb * (1 - frontColour.a);
            let blendedAlpha = frontColour.a + backColour.a * (1 - frontColour.a);

            return vec4f(blendedRGB, blendedAlpha);
        }

        @fragment
        fn fragment_main(@builtin(position) position: vec4f) -> @location(0) vec4f {

            let fragCoords = vec2i(position.xy);

            let backColour = textureLoad(backTexture, fragCoords, 0);
            let frontColour = textureLoad(frontTexture, fragCoords, 0);
            let alphaMultiplier = 1.0 - frontColour.a;

            // frontColour.r += backColour.r * backColour.a * alphaMultiplier;
            // frontColour.g += backColour.g * backColour.a * alphaMultiplier;
            // frontColour.b += backColour.b * backColour.a * alphaMultiplier;

            // frontColour.a = 1.0 - alphaMultiplier * (1.0 - backColour.a);

            return blend(backColour, frontColour);
        }
    `
    bUniforms = {
        back: [null, 0, 0, 1, false, true, {texture: {sampleType: "float"}}],
        front: [null, 1, 0, 1, false, true, {texture: {sampleType: "float"}}],
    }
    bFragmentConfig = {
        targets: [
            {format: "rgba8unorm"}
        ]
    }
    bdShaders = `
        @binding(0) @group(0) var bBackTexture: texture_2d<f32>;
        @binding(1) @group(0) var fBackTexture: texture_2d<f32>;
        @binding(2) @group(0) var bFrontTexture: texture_2d<f32>;
        @binding(3) @group(0) var fFrontTexture: texture_2d<f32>;

        struct FragmentOutput {
            @location(0) backColour: vec4f,
            @location(1) frontColour: vec4f
        }

        @vertex
        fn vertex_main(@builtin(vertex_index) vertIndex: u32) -> @builtin(position) vec4f {
            const position = array<vec2f, 6>(
                vec2(-1.0, -1.0),
                vec2(1.0, -1.0),
                vec2(1.0, 1.0),
                vec2(-1.0, -1.0),
                vec2(1.0, 1.0),
                vec2(-1.0, 1.0),
            );
            
            return vec4(position[vertIndex], 0.0, 1.0);
        }

        fn blend(backColour: vec4f, frontColour: vec4f) -> vec4f {
            let blendedRGB = frontColour.rgb + backColour.rgb * (1 - frontColour.a);
            let blendedAlpha = frontColour.a + backColour.a * (1 - frontColour.a);

            return vec4f(blendedRGB, blendedAlpha);
        }

        @fragment
        fn fragment_main(@builtin(position) position: vec4f) -> FragmentOutput {

            let fragCoords = vec2i(position.xy);

            let bBackColour = textureLoad(bBackTexture, fragCoords, 0);
            let fBackColour = textureLoad(fBackTexture, fragCoords, 0);

            let bFrontColour = textureLoad(bFrontTexture, fragCoords, 0);
            let fFrontColour = textureLoad(fFrontTexture, fragCoords, 0);

            var output: FragmentOutput;
            output.backColour = blend(bBackColour, fBackColour);
            output.frontColour = blend(bFrontColour, fFrontColour);

            return output;
        }
    `
    bdUniforms = {
        bBack: [null, 0, 0, 1, false, true, {texture: {sampleType: "float"}}],
        fBack: [null, 1, 0, 1, false, true, {texture: {sampleType: "float"}}],
        bFront: [null, 2, 0, 1, false, true, {texture: {sampleType: "float"}}],
        fFront: [null, 3, 0, 1, false, true, {texture: {sampleType: "float"}}],
    }
    bdFragmentConfig = {
        targets: [
            {format: "rgba8unorm"},
            {format: "rgba8unorm"}
        ]
    }
    fShaders = `
        @binding(0) @group(0) var backTexture: texture_2d<f32>;
        @binding(1) @group(0) var frontTexture: texture_2d<f32>;

        @vertex
        fn vertex_main(@builtin(vertex_index) vertIndex: u32) -> @builtin(position) vec4f {
            const position = array<vec2f, 6>(
                vec2(-1.0, -1.0),
                vec2(1.0, -1.0),
                vec2(1.0, 1.0),
                vec2(-1.0, -1.0),
                vec2(1.0, 1.0),
                vec2(-1.0, 1.0),
            );
            
            return vec4(position[vertIndex], 0.0, 1.0);
        }

        fn blend(backColour: vec4f, frontColour: vec4f) -> vec4f {
            let blendedRGB = frontColour.rgb + backColour.rgb * (1 - frontColour.a);
            let blendedAlpha = frontColour.a + backColour.a * (1 - frontColour.a);

            return vec4f(blendedRGB, blendedAlpha);
        }

        @fragment
        fn fragment_main(@builtin(position) position: vec4f) -> @location(0) vec4f {

            let fragCoords = vec2i(position.xy);

            let backColour = textureLoad(backTexture, fragCoords, 0);
            let frontColour = textureLoad(frontTexture, fragCoords, 0);

            return blend(backColour, frontColour);
        }
    `
    fUniforms = {
        back: [null, 0, 0, 1, false, true, {texture: {sampleType: "float"}}],
        front: [null, 1, 0, 1, false, true, {texture: {sampleType: "float"}}],
    }
    fFragmentConfig = {
        targets: [
            {
                format: "bgra8unorm",
                blend: {
                    color: {
                        srcFactor: "one",
                        operation: "add",
                        dstFactor: "one-minus-src-alpha"
                    },
                    alpha: {
                        srcFactor: "one",
                        dstFactor: "one-minus-src-alpha",
                        operation: "add"
                    }
                }
            }
        ]
    }
    shaders = {}
    samplers = []
    meshes = []
    textures = []
    cUseTexture = null 
    ready = false
    gpuTimes = []
    lcwidth = 0
    lcheight = 0
    depthTexture
    depthLayers = 5
    renderScale = 1
    occlusionSupported = false
    occlusions = []
    renderingDepthLayers = this.depthLayers
    dualDepthPeeling = false
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

        window.gpuctx = gpucanvas.getContext("webgpu")
        
        gpuctx.configure({
            device: device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied"
        })

        this.occlusionSupported = "createQuerySet" in device

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

        for (let texture of this.textures) {
            texture.init(texture.src)
        }

        this.finalMesh = new this.Mesh(0, 0, 0, 0, 0, 0, [], [0], [])
        this.debugMesh = new this.Mesh(0, 0, 0, 0, 0, 0, [], [0], [])
        this.blendMesh = new this.Mesh(0, 0, 0, 0, 0, 0, [], [0], [])

        for (let mesh of this.meshes) {
            this.createShader(mesh.shaderName, mesh.shaders, mesh.uniforms, mesh.vertexConfig, mesh.fragmentConfig, mesh.pipelineConfig)
            let bindGroupLayout = this.shaders[mesh.shaderName].bindGroupLayout
            if (mesh.texture && mesh.texture.loaded) {
                mesh.createBindGroup(bindGroupLayout, [this.samplers[mesh.sampler], mesh.texture.texture.createView()])
            } else {
                mesh.createBindGroup(bindGroupLayout, [this.samplers[0], this.dTexture.createView()])
            }
            mesh.updateBuffers()
        }

        let tShaders = this.createDepthPeelingShaders(6, this.tTop, this.tVertex, this.tFragment)
        let tUniforms = this.createDepthPeelingUniforms(6, this.tUniforms)

        let tdShaders = this.createDualDepthPeelingShaders(6, this.tTop, this.tVertex, this.tFragment)
        let tdUniforms = this.createDualDepthPeelingUniforms(6, this.tUniforms)

        this.depthPeelingShaders = tShaders
        this.dualDepthPeelingShaders = tdShaders
        this.depthPeelingUniforms = tUniforms
        this.dualDepthPeelingUniforms = tdUniforms

        this.createShader("translucent", tShaders, tUniforms, this.vertexConfig, this.tFragmentConfig, this.dPipelineConfig)
        this.createShader("translucentd", tdShaders, tdUniforms, this.vertexConfig, this.tdFragmentConfig, {})
        this.createShader("final", this.fShaders, this.fUniforms, {}, this.fFragmentConfig, {})
        this.createShader("debug", this.debugShaders, this.debugUniforms, {}, this.fragmentConfig, {})

        this.createShader("blend", this.bShaders, this.bUniforms, {}, this.bFragmentConfig, {})
        this.createShader("blendd", this.bdShaders, this.bdUniforms, {}, this.bdFragmentConfig, {})

        this.finalMesh.renderA = (passEncoder) => {
            passEncoder.setPipeline(this.shaders.final.pipeline)
            
            passEncoder.setBindGroup(0, this.finalMesh.bindGroups.final)

            passEncoder.draw(6)
        }

        this.debugMesh.renderA = (passEncoder) => {
            passEncoder.setPipeline(this.shaders.debug.pipeline)

            passEncoder.setBindGroup(0, this.debugMesh.bindGroups.debug)

            passEncoder.draw(6)
        }

        this.blendMesh.renderA = (passEncoder) => {
            passEncoder.setPipeline(this.dualDepthPeeling ? this.shaders.blendd.pipeline : this.shaders.blend.pipeline)

            passEncoder.setBindGroup(0, this.dualDepthPeeling ? this.blendMesh.bindGroups.blendd : this.blendMesh.bindGroups.blend)

            passEncoder.draw(6)
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
    resizeCanvas() {
        gpucanvas.width = window.innerWidth
        gpucanvas.height = window.innerHeight
    }
    createDepthPeelingShaders(start, top, vertex, fragment) {
        return `
        struct FragmentOutput {
            @location(0) depth: f32, 
            @location(1) colour: vec4f
        }

        ${top}

        @binding(${start}) @group(0) var solidDepthTexture: texture_depth_2d;
        @binding(${start+1}) @group(0) var frontDepthTexture: texture_2d<f32>;
        @binding(${start+2}) @group(0) var frontColourTexture: texture_2d<f32>;
        @binding(${start+3}) @group(0) var<storage, read_write> drawn: array<u32>;
        @binding(${start+4}) @group(0) var<uniform> drawnIndex: u32;

        ${vertex}

        @fragment
        fn fragment_main(fragData: VertexOut) -> FragmentOutput{
            let fragCoord = fragData.position;
            let fragCoords = vec2i(fragCoord.xy);

            let solidDepth = textureLoad(solidDepthTexture, fragCoords, 0);
            let peelDepth = textureLoad(frontDepthTexture, fragCoords, 0).r;
            let lastFrontColour = textureLoad(frontColourTexture, fragCoords, 0);

            let alphaMultiplier = 1.0 - lastFrontColour.a;

            if fragCoord.z >= solidDepth {
                discard;
            }

            if fragCoord.z <= peelDepth {
                discard;
            }
                
            ${fragment}

            var output: FragmentOutput;
            output.depth = fragCoord.z;
            output.colour = vec4f(color.rgb * color.a, color.a);

            drawn[drawnIndex] = 1;

            return output;
        }
        `
    }
    createDepthPeelingUniforms(start, uniforms) {
        return {
            ...uniforms,
            solidDepthTexture: [null, start, 0, 1, true, true, {texture: {sampleType: "depth"}}],
            frontDepthTexture: [null, start+1, 0, 1, true, true, {texture: {sampleType: "unfilterable-float"}}],
            frontColourTexture: [null, start+2, 0, 1, true, true, {texture: {sampleType: "float"}}],
            drawn: [null, start+3, 0, 1, true, false, {buffer: {type: "storage"}}],
            drawnIndex: [null, start+4, 4, 1, false]
        }
    }
    createDualDepthPeelingShaders(start, top, vertex, fragment) {
        return `
        struct FragmentOutput {
            @location(0) frontColour: vec4f,
            @location(1) backColour: vec4f
        }

        ${top}

        @binding(${start}) @group(0) var solidDepthTexture: texture_depth_2d;
        @binding(${start+1}) @group(0) var<storage, read> readDepths: array<u32>;
        @binding(${start+2}) @group(0) var<storage, read_write> writeDepths: array<atomic<u32>>;
        @binding(${start+3}) @group(0) var<storage, read_write> drawn: array<u32>;
        @binding(${start+4}) @group(0) var<uniform> drawnIndex: u32;

        ${vertex}

        @fragment
        fn fragment_main(fragData: VertexOut) -> FragmentOutput
        {
            let fragCoord = fragData.position;
            let fragCoords = vec2i(fragCoord.xy);

            let index = u32(fragCoords.x) * textureDimensions(solidDepthTexture).y + u32(fragCoords.y);

            let fragDepth = fragCoord.z;

            let solidDepth = textureLoad(solidDepthTexture, fragCoords, 0);

            var output: FragmentOutput;

            var oDepth = vec2f(0);

            output.frontColour = vec4f(0);

            output.backColour = vec4f(0);

            let nearestDepth = 1 - bitcast<f32>(readDepths[index*2]);
            let furthestDepth = bitcast<f32>(readDepths[index*2+1]);

            if fragCoord.z >= solidDepth {
                discard;
            }

            if fragCoord.z <= 0.5 {
                discard;
            }

            ${fragment}

            if fragDepth < nearestDepth || fragDepth > furthestDepth {
                return output;
            }

            if fragDepth > nearestDepth && fragDepth < furthestDepth {
                oDepth = vec2f(1 - fragDepth, fragDepth);
                atomicMax(&writeDepths[index*2], bitcast<u32>(oDepth.x));
                atomicMax(&writeDepths[index*2+1], bitcast<u32>(oDepth.y));
                return output;
            }
            
            if (fragDepth == nearestDepth) {
                output.frontColour = vec4f(color.rgb * color.a, color.a);
            } else {
                output.backColour = vec4f(color.rgb * color.a, color.a);
            }

            drawn[drawnIndex] = 1;

            return output;
        }
        `
    }
    createDualDepthPeelingUniforms(start, uniforms) {
        return {
            ...uniforms,
            solidDepthTexture: [null, start, 0, 1, true, true, {texture: {sampleType: "depth"}}],
            readDepths: [null, start+1, 0, 1, true, false, {buffer: {type: "read-only-storage"}}],
            writeDepths: [null, start+2, 0, 1, true, false, {buffer: {type: "storage"}}],
            drawn: [null, start+3, 0, 1, true, false, {buffer: {type: "storage"}}],
            drawnIndex: [null, start+4, 4, 1, false]
        }
    }
    createShader(name, shaders, uniforms, vertexConfig, fragmentConfig, pipelineConfig) {
        if (!(name in this.shaders)) {
            let shaderModule = device.createShaderModule({
                code: shaders
            })

            let layout = {entries: []}

            uniforms = JSON.parse(JSON.stringify(uniforms))
            for (let name in uniforms) {
                if (uniforms[name][4]) {
                    uniforms[name][0] = device.createBuffer({
                        size: uniforms[name][2],
                        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                    })
                }
                let entry = {
                    binding: uniforms[name][1],
                    visibility: uniforms[name][3] == 0 ? GPUShaderStage.VERTEX : GPUShaderStage.FRAGMENT,
                }
               
                if (uniforms[name][6]) {
                    entry = {...entry, ...uniforms[name][6]}
                } else {
                    entry.buffer = { type: "uniform" }
                }
                layout.entries.push(entry)
            }
    
            let bindGroupLayout = device.createBindGroupLayout(layout)

            let pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            })
    
            let pipelineFormat = {
                layout: pipelineLayout, 
                primitive: {
                    topology: "triangle-list",
                },
                vertex: {
                    module: shaderModule,
                    ...vertexConfig
                },
                fragment: {
                    module: shaderModule,
                    ...fragmentConfig,
                },
                ...pipelineConfig
            }
    
            let pipeline = device.createRenderPipeline(pipelineFormat)
            pipelineFormat.primitive.cullMode = "back"
            pipelineFormat.primitive.frontFace = "ccw"
            let cullPipeline = device.createRenderPipeline(pipelineFormat)

            this.shaders[name] = {
                uniforms: uniforms,
                bindGroupLayout: bindGroupLayout,
                pipeline: pipeline,
                cullPipeline: cullPipeline,
                layout: layout,
            }
        }
    }
    createBindGroup(layout, shaderName, customValues=[]) {
        let bLayout = {layout: layout, entries: []}

        let uniforms = this.shaders[shaderName].uniforms

        let uniformsB = {}
        
        for (let name in uniforms) {
            if (!uniforms[name][4] && !uniforms[name][5]) {
                uniformsB[name] = device.createBuffer({
                    size: uniforms[name][2],
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                })
            }
        }

        let i = 0
        for (let name in uniforms) {
            if (!uniforms[name][5]) {
                bLayout.entries.push({
                    binding: uniforms[name][1],
                    resource: {
                        buffer: uniforms[name][4] ? uniforms[name][0] : uniformsB[name]
                    }
                })
            } else {
                bLayout.entries.push({
                    binding: uniforms[name][1],
                    resource: customValues[i] ? customValues[i] : null
                })
                i++
            }
        }
        return [device.createBindGroup(bLayout), uniformsB]
    }
    setShader(passEncoder, shader, cull) {
        if (shader in this.shaders) {
            let pipeline = cull ? this.shaders[shader].cullPipeline : this.shaders[shader].pipeline
            if (pipeline != this.cPipeline) {
                passEncoder.setPipeline(pipeline)
                this.justChanged = true
                this.cPipeline = pipeline
            }
        }
    }
    setGlobalUniform(name, buffer) {
        for (let shader in this.shaders) {
            if (name in webgpu.shaders[shader].uniforms) {
                if (webgpu.shaders[shader].uniforms[name][0]) {
                    device.queue.writeBuffer(webgpu.shaders[shader].uniforms[name][0], 0, buffer, 0, buffer.length)
                }
            }
        }
    }
    render(background=[0, 0, 0, 1]) {

        var newMethod = this.dualDepthPeeling != this.lastDualDepthPeeling
        this.lastDualDepthPeeling = this.dualDepthPeeling

        let realDepthLayers = this.dualDepthPeeling ? this.depthLayers : this.depthLayers * 2

        let fromLast = Math.min(Math.max(this.renderingDepthLayers+1, 0), realDepthLayers)

        var cresized = gpucanvas.width != this.lcwidth || gpucanvas.height != this.lcheight || this.depthLayers != this.lastDepthLayers
        this.lcwidth = gpucanvas.width
        this.lcheight = gpucanvas.height
        this.lastDepthLayers = this.depthLayers

        let solid = []
        let transparent = []
        for (let mesh of this.meshes) {
            if (mesh == this.finalMesh || mesh == this.debugMesh || mesh == this.blendMesh) continue
            if (mesh.transparent) {
                transparent.push(mesh)
            } else {
                solid.push(mesh)
            }
        }

        this.cUseTexture = null

        var commandEncoder = device.createCommandEncoder()

        if (cresized || newMethod) {
            this.depthTexture = device.createTexture({
                size: [gpucanvas.width, gpucanvas.height],
                format: "depth24plus",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                label: "depthTexture"
            })

            if (this.dualDepthPeeling) {
                this.frontColour1Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "frontColour1Texture"
                })
                this.frontColour2Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "frontColour2Texture"
                })
                this.frontColour3Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "frontColour3Texture"
                })
    
                this.backColour1Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "backColour1Texture"
                })
                this.backColour2Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "backColour2Texture"
                })
                this.backColour3Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "backColour3Texture"
                })
    
                this.depthsReadBuffer = device.createBuffer({
                    size: gpucanvas.width * gpucanvas.height * 2 * Float32Array.BYTES_PER_ELEMENT,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
                })
                this.depthsWriteBuffer = device.createBuffer({
                    size: gpucanvas.width * gpucanvas.height * 2 * Float32Array.BYTES_PER_ELEMENT,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
                })
                this.depthsSwapBuffer = device.createBuffer({
                    size: gpucanvas.width * gpucanvas.height * 2 * Float32Array.BYTES_PER_ELEMENT,
                    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST 
                })
    
                this.depthsInitBuffer = device.createBuffer({
                    size: gpucanvas.width * gpucanvas.height * 2 * Float32Array.BYTES_PER_ELEMENT,
                    usage: GPUBufferUsage.COPY_SRC,
                    mappedAtCreation: true
                })
                var buffer = new Float32Array(this.depthsInitBuffer.getMappedRange())
                for (let i = 0; i < buffer.length; i++) {
                    buffer[i] = 1
                }
                this.depthsInitBuffer.unmap()
    
                this.depths2InitBuffer = device.createBuffer({
                    size: gpucanvas.width * gpucanvas.height * 2 * Float32Array.BYTES_PER_ELEMENT,
                    usage: GPUBufferUsage.COPY_SRC,
                    mappedAtCreation: true
                })
                var buffer = new Float32Array(this.depths2InitBuffer.getMappedRange())
                for (let i = 0; i < buffer.length; i++) {
                    buffer[i] = 0
                }
                this.depths2InitBuffer.unmap()

                this.shaders.translucentd.uniforms.readDepths[0] = this.depthsReadBuffer
                this.shaders.translucentd.uniforms.writeDepths[0] = this.depthsWriteBuffer
            } else {
                this.depthPeelTexture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "r32float",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "depthPeelTexture"
                })
                this.lastDepthPeelTexture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "r32float",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "depthPeelTexture"
                })

                this.depthPeel2Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "depth24plus",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "depthPeel2Texture"
                })

                this.colour1Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "colour1Texture"
                })
                this.colour2Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "colour2Texture"
                })
                this.colour3Texture = device.createTexture({
                    size: [gpucanvas.width, gpucanvas.height],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                    label: "colour3Texture"
                })
            }

            for (let mesh of transparent) {
                for (let i = 0; i < realDepthLayers; i++) delete mesh.bindGroups[i]
            }

            this.drawnBuffer = device.createBuffer({
                size: realDepthLayers * Uint32Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            })

            this.drawnInitBuffer = device.createBuffer({
                size: realDepthLayers * Uint32Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.COPY_SRC,
                mappedAtCreation: true
            })
            var buffer = new Uint32Array(this.drawnInitBuffer.getMappedRange())
            for (let i = 0; i < buffer.length; i++) {
                buffer[i] = 0
            }
            this.drawnInitBuffer.unmap()

            // this.drawnReadBuffer = device.createBuffer({
            //     size: this.depthLayers * BigUint64Array.BYTES_PER_ELEMENT,
            //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            // })

            // this.drawBuffers = []
            // for (let i = 0; i < this.depthLayers; i++) {
            //     let drawnBuffer = device.createBuffer({
            //         size: 1 * Uint32Array.BYTES_PER_ELEMENT,
            //         usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            //         mappedAtCreation: true,
            //         label: "drawnBuffer"+i
            //     })
            //     var buffer = new Uint32Array(drawnBuffer.getMappedRange())
            //     for (let i = 0; i < buffer.length; i++) {
            //         buffer[i] = 0
            //     }
            //     drawnBuffer.unmap()
            //     this.drawBuffers.push(drawnBuffer)
            // }

            // this.drawnReadBuffer = device.createBuffer({
            //     size: 1 * Uint32Array.BYTES_PER_ELEMENT,
            //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            //     label: "drawnReadBuffer"
            // })

            for (let mesh of transparent) {
                mesh.shaderName = "defualt"
                // for (let i = 0; i < 3; i++) delete mesh.bindGroups[i]
            }
          
            // this.shaders.translucent.uniforms.drawn[0] = this.drawnBuffer
            // this.shaders.translucentd.uniforms.drawn[0] = this.drawnBuffer
        }

        var depthTextureView = this.depthTexture.createView()

        var textureView = gpuctx.getCurrentTexture().createView()

        var renderPassDescriptor = {
            colorAttachments: [{
                clearValue: {r: background[0], g: background[1], b: background[2], a: background[3]},
                loadOp: 'clear',
                storeOp: 'store',
                view: textureView
            }],
            depthStencilAttachment: {
                view: depthTextureView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
        }
    
        var solidEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
        
        this.cPipeline = null

        for (let mesh of solid) {
            mesh.render(solidEncoder)
        }

        // for (let mesh of transparent) {
        //     mesh.render(solidEncoder)
        // }

        solidEncoder.end()

        let drawnReadBuffer = device.createBuffer({
            size: realDepthLayers * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        })

        this.shaders.translucent.uniforms.drawn[0] = this.drawnBuffer
        this.shaders.translucentd.uniforms.drawn[0] = this.drawnBuffer

        commandEncoder.copyBufferToBuffer(this.drawnInitBuffer, 0, this.drawnBuffer, 0, this.drawnInitBuffer.size)

        if (this.depthLayers > 0) {
            if (this.dualDepthPeeling) {
                this.doDualDepthPeeling(commandEncoder, textureView, depthTextureView, transparent, fromLast)
            } else {
                this.doDepthPeeling(commandEncoder, textureView, depthTextureView, transparent, fromLast)
            }
    
        }
       
        // console.log("end")
        // this.debugTexture(commandEncoder, textureView, fRots[finished], this.depthsWriteBuffer)

        // renderPassDescriptor = {
        //     colorAttachments: [{
        //         clearValue: {r: 0, g: 0, b: 0, a: 0},
        //         loadOp: "clear",
        //         storeOp: "store",
        //         view: depthPeelTextureView
        //     },{
        //         clearValue: {r: 0, g: 0, b: 0, a: 1},
        //         loadOp: "load",
        //         storeOp: "store",
        //         view: frontColourTextureView
        //     }],
        //     depthStencilAttachment: {
        //         view: this.depthPeel2Texture.createView(),
        //         depthClearValue: 1,
        //         depthLoadOp: "clear",
        //         depthStoreOp: "store"
        //     }
        // }

        // var transparentEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

        // // this.debugTexture(commandEncoder, textureView, this.depthTexture)

        // for (let mesh of transparent) {
        //     mesh.setShader("translucent", this.tShaders, this.tUniforms, this.vertexConfig, this.tFragmentConfig, this.dPipelineConfig)
        //     if (mesh.texture && mesh.texture.loaded) {
        //         mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[mesh.sampler], mesh.texture ? mesh.texture.texture.createView() : this.dTexture, depthTextureView, lastDepthPeelTextureView, lastFrontColourTextureView])
        //     } else {
        //         mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[0], this.dTexture.createView(), depthTextureView, lastDepthPeelTextureView, lastFrontColourTextureView])
        //     }

        //     mesh.render(transparentEncoder)
        // }

        // transparentEncoder.end()

        // renderPassDescriptor.colorAttachments[0].view = lastDepthPeelTextureView
        // renderPassDescriptor.colorAttachments[1].view = lastFrontColourTextureView
        // renderPassDescriptor.colorAttachments[1].loadOp = "load"

        // transparentEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
        // this.cPipeline = null

        // for (let mesh of transparent) {
        //     mesh.setShader("translucent", this.tShaders, this.tUniforms, this.vertexConfig, this.tFragmentConfig, this.dPipelineConfig)
        //     if (mesh.texture && mesh.texture.loaded) {
        //         mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[mesh.sampler], mesh.texture ? mesh.texture.texture.createView() : this.dTexture, depthTextureView, depthPeelTextureView, frontColourTextureView])
        //     } else {
        //         mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[0], this.dTexture.createView(), depthTextureView, depthPeelTextureView, frontColourTextureView])
        //     }
        //     mesh.render(transparentEncoder)
        // }

        // transparentEncoder.end()

        // let i = this.depthLayers+1

        // console.log((i + 2) % 3)
       
        // console.log((i + 0) % 3, (i + 1) % 3)
        // this.debugTexture(commandEncoder, textureView, bRots[(i + 2) % 3], this.depthsWriteBuffer)

        commandEncoder.copyBufferToBuffer(this.drawnBuffer, 0, drawnReadBuffer, 0, this.drawnBuffer.size)
        
        let start = performance.now()
        device.queue.submit([commandEncoder.finish()])

        let occlusions = []

        drawnReadBuffer.mapAsync(GPUMapMode.READ).then(() => {
            let results = new Uint32Array(drawnReadBuffer.getMappedRange())
            results = [...results]
            this.renderingDepthLayers = 0
            for (let result of results) {
                occlusions.push(result == 1)
                if (result == 1) this.renderingDepthLayers += 1
            }
            // console.log(this.renderingDepthLayers)
            this.occlusions = occlusions
            drawnReadBuffer.unmap()
        })
       
        
        // for (let i = 0; i < drawBuffers.length; i++) {
        //     drawBuffers[i][1].mapAsync(GPUMapMode.READ).then(() => {
        //         returned++
        //         let results2 = new BigUint64Array(drawBuffers[i][1].getMappedRange())
        //         occlusions[i] = results2[0]
        //         if (returned >= drawBuffers.length) {
        //             this.occlusions = occlusions
        //         }
        //         drawBuffers[i][1].unmap()
        //     })
    
        // }

        device.queue.onSubmittedWorkDone().then(() => {
            this.gpuTimes.push(performance.now() - start)
            if (this.gpuTimes.length > 100) this.gpuTimes.splice(0, 1)
        })
    }
    doDepthPeeling(commandEncoder, textureView, depthTextureView, transparent, depthLayers) {
        var depthPeelTextureView = this.depthPeelTexture.createView()
        var lastDepthPeelTextureView = this.lastDepthPeelTexture.createView()

        var colour1TextureView = this.colour1Texture.createView()
        var colour2TextureView = this.colour2Texture.createView()
        var colour3TextureView = this.colour3Texture.createView()

        this.clearTexture(commandEncoder, depthPeelTextureView, [0, 0, 0, 0])
        this.clearTexture(commandEncoder, lastDepthPeelTextureView, [0, 0, 0, 0])

        this.clearTexture(commandEncoder, colour1TextureView, [0, 0, 0, 0])
        this.clearTexture(commandEncoder, colour2TextureView, [0, 0, 0, 0])
        this.clearTexture(commandEncoder, colour3TextureView, [0, 0, 0, 0])

        var rots = [colour1TextureView, colour2TextureView, colour3TextureView]

        for (let i = 0; i < depthLayers; i++) {
            // console.log(i % 2 == 0)
            this.cPipeline = null
            var renderPassDescriptor = {
                colorAttachments: [{
                    clearValue: {r: 1, g: 0, b: 0, a: 0},
                    loadOp: "clear",
                    storeOp: "store",
                    view: i % 2 == 0 ? depthPeelTextureView : lastDepthPeelTextureView
                },{
                    clearValue: {r: 0, g: 0, b: 0, a: 1},
                    loadOp: "load",
                    storeOp: "store",
                    view: rots[i % 3]
                }],
                depthStencilAttachment: {
                    view: this.depthPeel2Texture.createView(),
                    depthClearValue: 1,
                    depthLoadOp: "clear",
                    depthStoreOp: "store"
                }
            }

            this.clearTexture(commandEncoder, i % 2 == 0 ? depthPeelTextureView : lastDepthPeelTextureView, [0, 0, 0, 0])
            this.clearTexture(commandEncoder, rots[i % 3], [0, 0, 0, 0])

            var transparentEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

            let lastD = i % 2 == 0 ? lastDepthPeelTextureView : depthPeelTextureView
            let lastC = rots[(i + 1) % 3]
            let id = i

            let drawnIndexBuffer = new Uint32Array([i])

            for (let mesh of transparent) {
                if (mesh.shaderName != "translucent") {
                    mesh.setShader("translucent", this.depthPeelingShaders, this.depthPeelingUniforms, this.vertexConfig, this.tFragmentConfig, this.dPipelineConfig)
                }
                if (!(id in mesh.bindGroups)) {
                    if (mesh.texture && mesh.texture.loaded) {
                        mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[mesh.sampler], mesh.texture ? mesh.texture.texture.createView() : this.dTexture, depthTextureView, lastD, lastC])
                    } else {
                        mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[0], this.dTexture.createView(), depthTextureView, lastD, lastC])
                    }
                    mesh.bindGroups[id] = mesh.bindGroups.translucent
                }
                // if (mesh.texture && mesh.texture.loaded) {
                //     mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[mesh.sampler], mesh.texture ? mesh.texture.texture.createView() : this.dTexture, depthTextureView, lastD, lastC])
                // } else {
                //     mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[0], this.dTexture.createView(), depthTextureView, lastD, lastC])
                // }
                mesh.bindGroups.translucent = mesh.bindGroups[id]

                device.queue.writeBuffer(mesh.uniformsB.drawnIndex, 0, drawnIndexBuffer, 0, drawnIndexBuffer.length)

                mesh.render(transparentEncoder)
            } 

            transparentEncoder.end()

            if (i < depthLayers-1) {
                renderPassDescriptor = {
                    colorAttachments: [{
                        clearValue: {r: 0, g: 0, b: 0, a: 1},
                        loadOp: 'load',
                        storeOp: 'store',
                        view: rots[(i + 2) % 3]
                    }]
                }

                this.clearTexture(commandEncoder, rots[(i + 2) % 3], [0, 0, 0, 0])
    
                var blendEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
                this.cPipeline = null
    
                this.blendMesh.setShader("blend", this.bShaders, this.bUniforms, {}, this.bFragmentConfig, {})
                this.blendMesh.createBindGroup(this.shaders.blend.bindGroupLayout, [rots[(i + 0) % 3], rots[(i + 1) % 3]])
                this.blendMesh.render(blendEncoder)
        
                blendEncoder.end()
            }
        }

        renderPassDescriptor = {
            colorAttachments: [{
                clearValue: {r: 0, g: 0, b: 0, a: 1},
                loadOp: 'load',
                storeOp: 'store',
                view: textureView
            }]
        }

        var finalEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

        let i = depthLayers+1

        this.finalMesh.setShader("final", this.fShaders, this.fUniforms, {}, this.fFragmentConfig, {})
        this.finalMesh.createBindGroup(this.shaders.final.bindGroupLayout, [rots[(i + 1) % 3], rots[(i + 2) % 3]])
        this.finalMesh.render(finalEncoder)

        finalEncoder.end()
    }
    doDualDepthPeeling(commandEncoder, textureView, depthTextureView, transparent, depthLayers) {
        var frontColour1View = this.frontColour1Texture.createView()
        var frontColour2View = this.frontColour2Texture.createView()
        var frontColour3View = this.frontColour3Texture.createView()

        var backColour1View = this.backColour1Texture.createView()
        var backColour2View = this.backColour2Texture.createView()
        var backColour3View = this.backColour3Texture.createView()

        this.clearTexture(commandEncoder, frontColour1View, [0, 0, 0, 1])
        this.clearTexture(commandEncoder, frontColour2View, [0, 0, 0, 1])
        this.clearTexture(commandEncoder, frontColour3View, [0, 0, 0, 1])

        this.clearTexture(commandEncoder, backColour1View, [0, 0, 0, 1])
        this.clearTexture(commandEncoder, backColour2View, [0, 0, 0, 1])
        this.clearTexture(commandEncoder, backColour3View, [0, 0, 0, 1])

        var fRots = [frontColour1View, frontColour2View, frontColour3View]
        var bRots = [backColour1View, backColour2View, backColour3View]

        commandEncoder.copyBufferToBuffer(this.depthsInitBuffer, 0, this.depthsReadBuffer, 0, this.depthsInitBuffer.size)
        commandEncoder.copyBufferToBuffer(this.depths2InitBuffer, 0, this.depthsWriteBuffer, 0, this.depths2InitBuffer.size)

        this.cPipeline = null
        var renderPassDescriptor = {
            colorAttachments: [{
                clearValue: {r: 0, g: 0, b: 0, a: 0},
                loadOp: "clear",
                storeOp: "store",
                view: fRots[2]
            },{
                clearValue: {r: 0, g: 0, b: 0, a: 0},
                loadOp: "clear",
                storeOp: "store",
                view: bRots[2]
            }]
        }

        this.shaders.translucentd.uniforms.readDepths[0] = this.depthsReadBuffer
        this.shaders.translucentd.uniforms.writeDepths[0] = this.depthsWriteBuffer

        var initEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

        for (let mesh of transparent) {
            if (mesh.shaderName != "translucentd") {
                mesh.setShader("translucentd", this.dualDepthPeelingShaders, this.dualDepthPeelingUniforms, this.vertexConfig, this.tdFragmentConfig, {})
                if (mesh.texture && mesh.texture.loaded) {
                    mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[mesh.sampler], mesh.texture ? mesh.texture.texture.createView() : this.dTexture, depthTextureView])
                } else {
                    mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[0], this.dTexture.createView(), depthTextureView])
                }
            }
            mesh.render(initEncoder)
        } 
    
        initEncoder.end()

        // this.debugTexture(commandEncoder, textureView, frontColourTextureView, this.depthsWriteBuffer)

        let results = []

        let finished = 0

        for (let i = 0; i < depthLayers; i++) {
            this.cPipeline = null

            let newi = 0
            while (results.includes(newi)) {
                newi++
            }
            
            renderPassDescriptor = {
                colorAttachments: [{
                    clearValue: {r: 0, g: 0, b: 0, a: 0},
                    loadOp: "clear",
                    storeOp: "store",
                    view: fRots[newi]
                },{
                    clearValue: {r: 0, g: 0, b: 0, a: 0},
                    loadOp: "clear",
                    storeOp: "store",
                    view: bRots[newi]
                }]
            }

            // commandEncoder.copyBufferToBuffer(this.depthsReadBuffer, 0, this.depthsSwapBuffer, 0, this.depthsReadBuffer.size)
            commandEncoder.copyBufferToBuffer(this.depthsWriteBuffer, 0, this.depthsReadBuffer, 0, this.depthsWriteBuffer.size)
            // commandEncoder.copyBufferToBuffer(this.depthsSwapBuffer, 0, this.depthsWriteBuffer, 0, this.depthsSwapBuffer.size)

            commandEncoder.copyBufferToBuffer(this.depths2InitBuffer, 0, this.depthsWriteBuffer, 0, this.depths2InitBuffer.size)

            // this.shaders.translucent.uniforms.drawn[0] = drawBuffers[i][0]
            
            this.clearTexture(commandEncoder, fRots[newi], [0, 0, 0, 0])
            this.clearTexture(commandEncoder, bRots[newi], [0, 0, 0, 0])

            var transparentEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

            let id = i

            let drawnIndexBuffer = new Uint32Array([i])

            for (let mesh of transparent) {
                // if (mesh.shaderName != "translucent") {
                //     mesh.setShader("translucent", this.tShaders, this.tUniforms, this.vertexConfig, this.tFragmentConfig, this.tPipelineConfig)
                // }
                // mesh.setShader("translucent", this.tShaders, this.tUniforms, this.vertexConfig, this.tFragmentConfig, this.tPipelineConfig)
                // // if (!(id in mesh.bindGroups)) {
                    
                // //     mesh.bindGroups[id] = mesh.bindGroups.translucent
                // // }
                if (!(id in mesh.bindGroups)) {
                    if (mesh.texture && mesh.texture.loaded) {
                        mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[mesh.sampler], mesh.texture ? mesh.texture.texture.createView() : this.dTexture, depthTextureView])
                    } else {
                        mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[0], this.dTexture.createView(), depthTextureView])
                    }
                    mesh.bindGroups[id] = mesh.bindGroups.translucentd
                }

                mesh.bindGroups.translucentd = mesh.bindGroups[id]

                device.queue.writeBuffer(mesh.uniformsB.drawnIndex, 0, drawnIndexBuffer, 0, drawnIndexBuffer.length)
               
                // if (mesh.texture && mesh.texture.loaded) {
                //     mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[mesh.sampler], mesh.texture ? mesh.texture.texture.createView() : this.dTexture, depthTextureView, lastD, lastC])
                // } else {
                //     mesh.createBindGroup(this.shaders[mesh.shaderName].bindGroupLayout, [this.samplers[0], this.dTexture.createView(), depthTextureView, lastD, lastC])
                // }
                // mesh.bindGroups.translucent = mesh.bindGroups[id]
                mesh.render(transparentEncoder)
            } 

            results.push(newi)
            finished = newi

            transparentEncoder.end()

            if (results.length >= 2) {
                let missing = 0
                while (results.includes(missing)) {
                    missing++
                }

                renderPassDescriptor = {
                    colorAttachments: [{
                        clearValue: {r: 0, g: 0, b: 0, a: 1},
                        loadOp: 'load',
                        storeOp: 'store',
                        view: bRots[missing]
                    },{
                        clearValue: {r: 0, g: 0, b: 0, a: 1},
                        loadOp: 'load',
                        storeOp: 'store',
                        view: fRots[missing]
                    }]
                }

                this.clearTexture(commandEncoder, bRots[missing], [0, 0, 0, 0])
                this.clearTexture(commandEncoder, fRots[missing], [0, 0, 0, 0])
    
                var blendEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
                this.cPipeline = null
                // console.log(i - 0, i - 1)
                this.blendMesh.setShader("blendd", this.bdShaders, this.bdUniforms, {}, this.bdFragmentConfig, {})
                this.blendMesh.createBindGroup(this.shaders.blendd.bindGroupLayout, [bRots[results[0]], bRots[results[1]], fRots[results[1]], fRots[results[0]]])
                this.blendMesh.render(blendEncoder)
        
                blendEncoder.end()
                results = [missing]
                finished = missing
            }

            // this.debugTexture(commandEncoder, textureView, backColourTextureView, this.depthsWriteBuffer)
        }

        renderPassDescriptor = {
            colorAttachments: [{
                clearValue: {r: 0, g: 0, b: 0, a: 1},
                loadOp: 'load',
                storeOp: 'store',
                view: textureView
            }]
        }

        var finalEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

        this.finalMesh.setShader("final", this.fShaders, this.fUniforms, {}, this.fFragmentConfig, {})
        this.finalMesh.createBindGroup(this.shaders.final.bindGroupLayout, [bRots[finished], fRots[finished]])
        this.finalMesh.render(finalEncoder)

        finalEncoder.end()
    }
    clearTexture(commandEncoder, textureView, clearColour) {
        var renderPassDescriptor = {
            colorAttachments: [{
                clearValue: {r: clearColour[0], g: clearColour[1], b: clearColour[2], a: clearColour[3]},
                loadOp: "clear",
                storeOp: 'store',
                view: textureView
            }]
        }

        var pass = commandEncoder.beginRenderPass(renderPassDescriptor)

        pass.end()
    }
    debugTexture(commandEncoder, canvasView, textureView, storage) {

        var renderPassDescriptor = {
            colorAttachments: [{
                clearValue: {r: 0, g: 0, b: 0, a: 1},
                loadOp: 'clear',
                storeOp: 'store',
                view: canvasView
            }]
        }

        let pass = commandEncoder.beginRenderPass(renderPassDescriptor)
        
        this.shaders.debug.uniforms.storage[0] = storage
        this.debugMesh.setShader("debug", this.debugShaders, this.debugUniforms, {}, this.fragmentConfig, {})
        this.debugMesh.createBindGroup(this.shaders.debug.bindGroupLayout, [textureView])
        this.debugMesh.render(pass)

        pass.end()
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
                        if (!mesh.transparent) {
                            mesh.createBindGroup(webgpu.shaders[mesh.shaderName].bindGroupLayout, [webgpu.samplers[mesh.sampler], this.texture.createView()])
                        } else {
                            // for (let i = 0; i < 3; i++) delete mesh.bindGroups[i]
                            let layers = webgpu.dualDepthPeeling ? webgpu.depthLayers : webgpu.depthLayers * 2
                            mesh.shaderName = "default"
                            for (let i = 0; i < layers; i++) delete mesh.bindGroups[i]
                        }
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
            customBuffers = []
            transparent = false
            bindGroupInfo = null
            bindGroups = {}
            updateModel = true
            model
            constructor(x, y, z, width, height, depth, vertices=[], faces=[], colours=[]) {
                this.pos = {x: x, y: y, z: z}
                this.size = {x: width, y: height, z: depth}
                this.rot = {x: 0, y: 0, z: 0}
                this.vertices = vertices
                this.colours = colours
                this.faces = faces
                this.uvs = []
                this.shaderName = webgpu.dShaderName
                this.shaders = webgpu.dShaders
                this.uniforms = webgpu.dUniforms
                this.vertexConfig = webgpu.vertexConfig
                this.fragmentConfig = webgpu.fragmentConfig
                this.pipelineConfig = webgpu.dPipelineConfig
                webgpu.meshes.push(this)
                if (webgpu.ready) {
                    webgpu.createShader(this.shaderName, this.shaders, this.uniforms, this.vertexConfig, this.fragmentConfig, this.pipelineConfig)
                    this.createBindGroup(webgpu.shaders[this.shaderName].bindGroupLayout, [webgpu.samplers[0], webgpu.dTexture])
                    this.updateBuffers()
                }
            }
            setShader(shaderName, shaders, uniforms, vertexConfig, fragmentConfig, pipelineConfig) {
                this.shaderName = shaderName
                this.shaders = shaders
                this.uniforms = uniforms
                this.vertexConfig = vertexConfig
                this.fragmentConfig = fragmentConfig
                this.pipelineConfig = pipelineConfig
                if (webgpu.ready) webgpu.createShader(shaderName, shaders, uniforms, vertexConfig, fragmentConfig, pipelineConfig)
            }
            setTexture(texture) {
                this.texture = texture
                this.useTexture = true
                texture.connected.push(this)
                if (texture.loaded) {
                    if (webgpu.ready && this.transparent) {
                        this.createBindGroup(webgpu.shaders[this.shaderName].bindgroupLayout, [webgpu.samplers[this.sampler], this.texture.texture.createView()])
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

                let uniforms = webgpu.shaders[this.shaderName].uniforms
                
                for (let name in uniforms) {
                    if (!uniforms[name][4] && !uniforms[name][5]) {
                        this.uniformsB[name] = device.createBuffer({
                            size: uniforms[name][2],
                            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                        })
                    }
                }

                let i = 0
                for (let name in uniforms) {
                    if (!uniforms[name][5]) {
                        bLayout.entries.push({
                            binding: uniforms[name][1],
                            resource: {
                                buffer: uniforms[name][4] ? uniforms[name][0] : this.uniformsB[name]
                            }
                        })
                    } else {
                        bLayout.entries.push({
                            binding: uniforms[name][1],
                            resource: customValues[i] ? customValues[i] : null
                        })
                        i++
                    }
                }
                try {
                    this.bindGroups[this.shaderName] = device.createBindGroup(bLayout)
                } catch (e) {
                    console.log(bLayout)
                    console.error(e)
                }
            }
            updateBuffers() {
                if (!window.device) return
                let vertexes = []
                for (let i = 0; i < this.vertices.length/3; i++) {
                    let vertex = [
                        this.vertices[i*3], this.vertices[i*3+1], this.vertices[i*3+2], 
                        this.colours[i*4], this.colours[i*4+1], this.colours[i*4+2], this.colours[i*4+3],
                        this.uvs[i*2] ? this.uvs[i*2] : 0, this.uvs[i*2+1] ? this.uvs[i*2+1] : 0
                    ]
                    for (let buffer of this.customBuffers) {
                        for (let i2 = 0; i2 < buffer[0]; i2++) {
                            vertex.push(buffer[1][i*buffer[0]+i2])
                        }
                    }
                    vertexes.push(...vertex)
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
            renderA(passEncoder) {
                webgpu.setShader(passEncoder, this.shaderName, this.oneSide)

                passEncoder.setVertexBuffer(0, this.vertexBuffer)
                passEncoder.setIndexBuffer(this.indexBuffer, "uint32")

                if (this.updateModel) {
                    this.model = getModelMatrix(this.pos.x, this.pos.y, this.pos.z, this.rot.x, this.rot.y, this.rot.z, this.size.x, this.size.y, this.size.z)
                }
                let modelMatrix = this.model

                // // if (webgpu.justChanged) {
                // //     // console.log(this.shaderName, webgpu.setGlobals)
                // //     for (let name in webgpu.setGlobals) {
                // //         device.queue.writeBuffer(webgpu.shaders[this.shaderName].uniforms[name][0], 0, webgpu.setGlobals[name], 0, webgpu.setGlobals[name].length)
                // //     }
                // //     webgpu.justChanged = false
                // // }

                // device.queue.writeBuffer(webgpu.shaders[this.shaderName].uniforms["view"][0], 0, viewProjection, 0, viewProjection.length)
                device.queue.writeBuffer(this.uniformsB.model, 0, modelMatrix, 0, modelMatrix.length)

                if (this.useTexture != webgpu.cUseTexture) {
                    let utBuffer = new Uint32Array([this.useTexture ? 1 : 0])
                    device.queue.writeBuffer(this.uniformsB.useTexture, 0, utBuffer, 0, utBuffer.length)
                    webgpu.cUseTexture = this.useTexture
                }

                if (this.bindGroupInfo) {
                    passEncoder.setBindGroup(0, this.bindGroups[this.shaderName], this.bindGroupInfo)
                } else {
                    passEncoder.setBindGroup(0, this.bindGroups[this.shaderName])
                }
            
                passEncoder.drawIndexed(this.faces.length, 1, 0, 0, 0)
            }
            render(passEncoder) {
                if (this.faces.length <= 0) return
                if (this.texture != null) {
                    if (!this.texture.loaded) return
                }
                this.renderA(passEncoder)
            }
        }
    }

    get Box() {
		return class extends webgpu.Mesh {
			lastColour = []
			colour = [0, 0, 0, 1]
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
					0.5-o, 0.5, 0.5,
					0.5-o, -0.5, -0.5,
					0.5-o, 0.5, -0.5,
					0.5-o, -0.5, 0.5,
					// -X
					-0.5+o, 0.5, 0.5,
					-0.5+o, -0.5, -0.5,
					-0.5+o, 0.5, -0.5,
					-0.5+o, -0.5, 0.5,
					// +Y
					0.5, 0.5-o, 0.5,
					-0.5, 0.5-o, -0.5,
					0.5, 0.5-o, -0.5,
					-0.5, 0.5-o, 0.5,
					// -Y
					0.5, -0.5+o, 0.5,
					-0.5, -0.5+o, -0.5,
					0.5, -0.5+o, -0.5,
					-0.5, -0.5+o, 0.5,
					// +Z
					0.5, 0.5, -0.5+o,
					-0.5, -0.5, -0.5+o,
					0.5, -0.5, -0.5+o,
					-0.5, 0.5, -0.5+o,
					// -Z
					0.5, 0.5, 0.5-o,
					-0.5, -0.5, 0.5-o,
					0.5, -0.5, 0.5-o,
					-0.5, 0.5, 0.5-o,
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
							this.colours.push(this.colour[0]*0.85, this.colour[1]*0.85, this.colour[2]*0.85, this.colour[3])
						}
						// -X
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.7, this.colour[1]*0.7, this.colour[2]*0.7, this.colour[3])
						}
						// +Y
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*1, this.colour[1]*1, this.colour[2]*1, this.colour[3])
						}
						// -Y
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.55, this.colour[1]*0.55, this.colour[2]*0.55, this.colour[3])
						}
						// +Z
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.75, this.colour[1]*0.75, this.colour[2]*0.75, this.colour[3])
						}
						// -Z
						for (let i = 0; i < 4; i++) {
							this.colours.push(this.colour[0]*0.6, this.colour[1]*0.6, this.colour[2]*0.6, this.colour[3])
						}
					} else {
						for (let i = 0; i < 4*6; i++) {
							this.colours.push(this.colour[0]*1, this.colour[1]*1, this.colour[2]*1, this.colour[3])
						}
					}
					
					this.updateBuffers()
				}
				this.lastColour = [...this.colour]
				// this.pos.x -= this.size.x/2
				// this.pos.y -= this.size.y/2
				// this.pos.z -= this.size.z/2
				super.render(passEncoder)
				// this.pos.x += this.size.x/2
				// this.pos.y += this.size.y/2
				// this.pos.z += this.size.z/2
			}
		}
	}
}

var webgpu = new WebGPU()