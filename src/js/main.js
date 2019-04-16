function setHeight(container) {
    var rect = container.getBoundingClientRect();
    if (rect.width > 0) {
        var coords = container.getAttribute('data-skel').split(',');
        var width = Number(coords[0]), height = Number(coords[1]);
        container.style.height = (rect.width / (height / width)) + "px";
    }
}

function showPlayer() {
    var params = FAPI.Util.getRequestParameters();
    window.open('/player?logged_user_id='+params['logged_user_id']+'&session_key='+params['session_key']+'&auth_sig='+params['auth_sig']);
}

function alignToContainer(container, alignKey, elem) {
    var rect = container.getBoundingClientRect();
    if (rect.width > 0) {
        var key = rect.top + "," + rect.left + "," + rect.width + "," + rect.height;
        if (alignKey != key) {
            var coords = container.getAttribute('data-skel').split(',');
            var width = Number(coords[0]), height = Number(coords[1]), pointX = Number(coords[2]), pointY = Number(coords[3]) ;

            var scale = Math.min(rect.height / height, rect.width / width);
            elem.scaleX = scale;
            elem.scaleY = scale;
            elem.y = -(rect.top + rect.height / 2) - pointY * scale;
            elem.x = (rect.left + rect.width / 2) + pointX * scale;
        }
        return key;
    }
    return false;
}


function setSkinByName(skel, skinName) {
    skel.setSkin(null);
    skel.setSkinByName(skinName);
}

document.addEventListener("DOMContentLoaded", function (event) {
    var loader = PIXI.loader.add('char', 'spine/character.json').add('button','spine/Button.json');

    loader.load(function (loader, resources) {
        var app = new PIXI.Application({autoResize: true});
        var resolution = window.devicePixelRatio || 1;
        var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {resolution: resolution});
        app.renderer = renderer;
        var spine = new PIXI.spine.Spine(resources.char.spineData);
        app.stage.addChild(spine);
        var charAlignKey = '';
        var btns = {};

        Array.prototype.forEach.call(document.querySelectorAll('.button[data-skin]'),function(elem) {
            var skin = elem.getAttribute('data-skin');
            var button = new PIXI.spine.Spine(resources.button.spineData);
            setSkinByName(button.skeleton, skin);
            app.stage.addChild(button);
            elem.addEventListener('click', function (e) {
                var pressed = e.currentTarget.parentNode.querySelector('.button[data-pressed]');
                if(pressed && elem.getAttribute('data-animation')) {
                    btns[pressed.getAttribute('id')].state.setAnimation(0,'up');
                    pressed.removeAttribute('data-pressed');
                    spine.state.setEmptyAnimation(1, 1);
                }
                if (pressed !== elem) {
                    if (elem.getAttribute('data-animation')) {
                        spine.state.setAnimation(1, elem.getAttribute('data-animation'), true);
                        button.state.setAnimation(0, 'press');
                        elem.setAttribute('data-pressed', "1");
                    }
                    if (elem.getAttribute('data-char-skin')) {
                        setSkinByName(spine.skeleton, elem.getAttribute('data-char-skin'));
                        button.state.setAnimation(0, 'hover');
                    }
                }
                e.preventDefault();
            });
            button.htmlElem = elem;
            btns[elem.getAttribute('id')]=button;
        });

        var resize = function () {
            app.renderer.resize(window.innerWidth, window.innerHeight);
            renderer.view.style.width = window.innerWidth + "px";
            renderer.view.style.height = window.innerHeight + "px";
            var bg = spine.skeleton.findBone('b_bg');
            bg.scaleX = window.innerWidth / 100;
            bg.scaleY = window.innerHeight / 100;
            bg.x = 0;
            bg.y = 0;
            setHeight(document.getElementById('char'));
            for (var i in btns) {
                if(btns.hasOwnProperty(i)) {
                    btns[i].htmlAlignKey = setHeight(btns[i].htmlElem);
                }
            }
            charAlignKey = alignToContainer(document.getElementById('char'), charAlignKey, spine.skeleton.findBone('b_pos_char'));
            for (var i in btns) {
                if(btns.hasOwnProperty(i)) {
                    var btn = btns[i];
                    btn.htmlAlignKey = alignToContainer(btn.htmlElem, btn.htmlAlignKey, btn.skeleton.findBone('root'));
                }
            }
        };

        window.resize = resize;
        window.addEventListener('resize', resize);
        setSkinByName(spine.skeleton, 'girl');

        spine.stateData.defaultMix = 1;

        spine.state.setAnimation(0, 'idle_1', true);
        app.start();
        resize();
        document.body.insertBefore(app.view, document.body.firstChild);
    });
});