import * as alt from 'alt-client';
import * as native from 'natives';
import { AthenaClient } from '@AthenaClient/api/athena';
import { WebViewController } from '@AthenaClient/extensions/view2';
import ViewModel from '@AthenaClient/models/viewModel';
import { isAnyMenuOpen } from '@AthenaClient/utility/menus';
import { distance } from '../../../shared/utility/vector';
import { BarbershopEvents } from '../shared/events';
import { BarbershopData } from '../shared/interfaces';

const Z_POS_ADD = 0.62;
const FOV = 20;
const PAGE_NAME = 'Barbershop';
let isSelfService = false;
let currentData: BarbershopData;
let camera: number;
let hasRegisteredOnce = false;
let cameraOrbit = [];
let camIdx = 0;

class BarbershopView implements ViewModel {
    /**
     * Opens the BarberShop WebView and sets up current data for the player.
     *
     * @static
     * @param {boolean} _isSelfService
     * @param {BarbershopData} _currentData
     * @return {*}
     * @memberof BarbershopView
     */
    static async open(_isSelfService: boolean, _currentData: BarbershopData) {
        if (isAnyMenuOpen()) {
            return;
        }

        currentData = _currentData;
        isSelfService = _isSelfService;

        AthenaClient.webview.ready(PAGE_NAME, BarbershopView.ready);
        AthenaClient.webview.open([PAGE_NAME], true, BarbershopView.close);

        if (!hasRegisteredOnce) {
            hasRegisteredOnce = true;
            AthenaClient.webview.on(BarbershopEvents.WebViewEvents.UPDATE, BarbershopView.update);
            AthenaClient.webview.on(BarbershopEvents.WebViewEvents.SAVE_CLOSE, BarbershopView.saveClose);
        }

        WebViewController.focus();
        WebViewController.showCursor(true);

        alt.toggleGameControls(false);
        alt.Player.local.isMenuOpen = true;
    }

    /**
     * Closes the WebView page. Called from internal webview close event.
     * Can also be called from server-side; but doNotEmit is usually set to true.
     *
     * @static
     * @param {boolean} [doNotEmit=false]
     * @return {*}
     * @memberof BarbershopView
     */
    static async close(doNotEmit = false) {
        BarbershopView.destroyCamera();

        alt.toggleGameControls(true);
        WebViewController.unfocus();
        WebViewController.showCursor(false);

        alt.Player.local.isMenuOpen = false;

        if (doNotEmit) {
            return;
        }

        alt.emitServer(BarbershopEvents.ServerClientEvents.CLOSE);
    }

    /**
     * Simply closes the WebView, and ensures that an emit to server does not happen for close event.
     *
     * @static
     * @memberof BarbershopView
     */
    static saveClose() {
        BarbershopView.close(true);
        WebViewController.closePages([PAGE_NAME], true);
    }

    /**
     * It creates a camera, sets it active, renders it, points it at the player, and makes the player
     * look at the camera.
     */
    static setupCamera() {
        const fwdVector = native.getEntityForwardVector(alt.Player.local.scriptID);
        const fwdPos = {
            x: alt.Player.local.pos.x + fwdVector.x * 2,
            y: alt.Player.local.pos.y + fwdVector.y * 2,
            z: alt.Player.local.pos.z + Z_POS_ADD,
        };

        camera = native.createCamWithParams(
            'DEFAULT_SCRIPTED_CAMERA',
            fwdPos.x,
            fwdPos.y,
            fwdPos.z,
            0,
            0,
            0,
            FOV,
            true,
            0,
        );
        native.setCamActive(camera, true);
        native.renderScriptCams(true, false, 0, true, false, 0);
        native.pointCamAtCoord(
            camera,
            alt.Player.local.pos.x,
            alt.Player.local.pos.y,
            alt.Player.local.pos.z + Z_POS_ADD,
        );

        native.taskLookAtCoord(alt.Player.local.scriptID, fwdPos.x, fwdPos.y, fwdPos.z, -1, 0, 2);

        this.setupCameraOrbit();
        alt.on('keydown', this.handleKeyPressed);
    }

    static setupCameraOrbit() {
        const pos = alt.Player.local.pos;
        const fwdVector = native.getEntityForwardVector(alt.Player.local.scriptID);
        const fwdPos = {
            x: pos.x + fwdVector.x * 2,
            y: pos.y + fwdVector.y * 2,
            z: pos.z,
        };
        const radius = distance(pos, fwdPos);
        const cx = pos.x;
        const cy = pos.y;
        const angleRad = Math.atan2(fwdPos.y - cy, fwdPos.x - cx);
        const angle = ((angleRad > 0 ? angleRad : 2 * Math.PI + angleRad) * 360) / (2 * Math.PI);
        const step = 22.5;

        for (let i = 0; i < 360 / step - 1; i++) {
            let stepAngle = angle + i * step;

            if (stepAngle > 360) {
                stepAngle -= 360;
            }

            const point = this.pointsOnCircle(radius, stepAngle, cx, cy);
            cameraOrbit.push(point);
        }
    }

    static handleKeyPressed(key: alt.KeyCode) {
        if (key === 65 || key === 68) {
            if (key === 65) {
                if (camIdx === cameraOrbit.length - 1) {
                    camIdx = 0;
                } else {
                    camIdx++;
                }
            }
            if (key === 68) {
                if (camIdx === 0) {
                    camIdx = cameraOrbit.length - 1;
                } else {
                    camIdx--;
                }
            }

            native.setCamCoord(
                camera,
                cameraOrbit[camIdx].x,
                cameraOrbit[camIdx].y,
                alt.Player.local.pos.z + Z_POS_ADD,
            );
        }
    }

    static destroyCamera() {
        try {
            native.destroyAllCams(true);
            native.destroyCam(camera, true);
            native.renderScriptCams(false, false, 0, false, false, 0);
            alt.off('keydown', this.handleKeyPressed);
        } catch (err) {}

        camera = undefined;
        cameraOrbit = [];
        camIdx = 0;
    }

    /**
     * Calculate x and y in circle's circumference
     * @param {number} radius - The circle's radius
     * @param {number} angle - The angle in degrees
     * @param {number} cx - The circle's origin x
     * @param {number} cy - The circle's origin y
     * @returns {Object[x: number, y: number]} The calculated x and y
     */
    static pointsOnCircle(radius: number, angle: number, cx: number, cy: number) {
        angle = angle * (Math.PI / 180); // Convert from Degrees to Radians
        const x = cx + radius * Math.sin(angle);
        const y = cy + radius * Math.cos(angle);

        return { x: x, y: y };
    }

    /**
     * If the webview is ready, emit the data to the webview and setup the camera.
     */
    static async ready() {
        const view = await WebViewController.get();
        if (!view) {
            return;
        }

        AthenaClient.webview.emit(BarbershopEvents.WebViewEvents.SET_DATA, currentData);
        BarbershopView.setupCamera();
    }

    /**
     * This function is called when the player clicks on a button in the barbershop menu, and it sends
     * the data to the server.
     * @param {BarbershopData} data - BarbershopData
     */
    static update(data: BarbershopData) {
        alt.emitServer(BarbershopEvents.ServerClientEvents.UPDATE, data);
        native.playSoundFrontend(-1, 'HIGHLIGHT_NAV_UP_DOWN', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true);
    }
}

alt.onServer(BarbershopEvents.ServerClientEvents.OPEN, BarbershopView.open);
alt.onServer(BarbershopEvents.ServerClientEvents.CLOSE, BarbershopView.close);
