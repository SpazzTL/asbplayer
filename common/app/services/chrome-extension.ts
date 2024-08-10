import {
    AsbPlayerCommand,
    AsbPlayerToVideoCommandV2,
    AsbplayerInstance,
    CardModel,
    ExtensionToAsbPlayerCommand,
    ExtensionToAsbPlayerCommandTabsCommand,
    GetSettingsMessage,
    Message,
    MessageWithId,
    ToggleSidePanelMessage,
    PublishCardMessage,
    SetSettingsMessage,
    SettingsUpdatedMessage,
    VideoTabModel,
    AsbplayerHeartbeatMessage,
    GetActiveProfileMessage,
    SetActiveProfileMessage,
    GetProfilesMessage,
    AddProfileMessage,
    RemoveProfileMessage,
} from '@project/common';
import { AsbplayerSettings, Profile } from '@project/common/settings';
import { v4 as uuidv4 } from 'uuid';
import gte from 'semver/functions/gte';
import gt from 'semver/functions/gt';
import { isFirefox } from '../../browser-detection';

export interface ExtensionMessage {
    data: Message;
    tabId?: number;
    src?: string;
}

const id = uuidv4();

export default class ChromeExtension {
    readonly version: string;
    readonly extensionCommands: { [key: string]: string | undefined };

    tabs: VideoTabModel[] | undefined;
    asbplayers: AsbplayerInstance[] | undefined;
    installed: boolean;
    sidePanel: boolean;

    private readonly windowEventListener: (event: MessageEvent) => void;
    private readonly _responseResolves: { [key: string]: (value: any) => void } = {};
    private onMessageCallbacks: Array<(message: ExtensionMessage) => void>;
    private onTabsCallbacks: Array<(tabs: VideoTabModel[]) => void>;
    private heartbeatInterval?: NodeJS.Timeout;

    constructor(version?: string, extensionCommands?: { [key: string]: string | undefined }) {
        this.onMessageCallbacks = [];
        this.onTabsCallbacks = [];
        this.installed = version !== undefined;
        this.version = version ?? '';
        this.extensionCommands = extensionCommands ?? {};
        this.sidePanel = false;
        this.windowEventListener = (event: MessageEvent) => {
            if (event.source !== window) {
                return;
            }

            if (event.data.sender !== 'asbplayer-extension-to-player' || !event.data.message) {
                return;
            }

            if (event.data.asbplayerId && event.data.asbplayerId !== id) {
                return;
            }

            if (typeof event.data.message.messageId === 'string') {
                const messageId = event.data.message.messageId;

                if (messageId in this._responseResolves) {
                    this._responseResolves[messageId]?.(event.data.message.response);
                    delete this._responseResolves[messageId];
                }
            }

            if (event.data.message.command === 'tabs') {
                const tabsCommand = event.data as ExtensionToAsbPlayerCommandTabsCommand;
                this.tabs = tabsCommand.message.tabs;
                this.asbplayers = tabsCommand.message.asbplayers;

                for (let c of this.onTabsCallbacks) {
                    c(this.tabs);
                }

                if (tabsCommand.message.ackRequested) {
                    window.postMessage({
                        sender: 'asbplayerv2',
                        message: {
                            command: 'ackTabs',
                            id: id,
                            receivedTabs: this.tabs,
                            sidePanel: this.sidePanel,
                        },
                    });
                }
            } else {
                const command = event.data as ExtensionToAsbPlayerCommand<Message>;
                for (let c of this.onMessageCallbacks) {
                    c({
                        data: command.message,
                        tabId: command.tabId,
                        src: command.src,
                    });
                }
            }
        };

        window.addEventListener('message', this.windowEventListener);
    }

    get supportsPauseOnHover() {
        return this.installed && gte(this.version, '1.4.0');
    }

    get supportsSubtitlesWidthSetting() {
        return this.installed && gte(this.version, '1.4.0');
    }

    get supportsOrderableAnkiFields() {
        return this.installed && gte(this.version, '1.3.0');
    }

    get supportsTrackSpecificSettings() {
        return this.installed && gte(this.version, '1.3.0');
    }

    get supportsSettingsProfiles() {
        return this.installed && gte(this.version, '1.3.0');
    }

    get supportsStreamingVideoOverlay() {
        return this.installed && gte(this.version, '1.1.0');
    }

    get supportsSidePanel() {
        return this.installed && !isFirefox && gte(this.version, '1.0.0');
    }

    get supportsAppIntegration() {
        return this.installed && gte(this.version, '1.0.0');
    }

    get supportsWebSocketClient() {
        return this.installed && gte(this.version, '1.1.0');
    }

    get supportsVideoPlayerMiningCommands() {
        return this.installed && gte(this.version, '1.0.0');
    }

    get supportsPlaybackRateMessage() {
        return this.installed && gte(this.version, '0.24.0');
    }

    get supportsOffsetMessage() {
        return this.installed && gte(this.version, '0.23.0');
    }

    startHeartbeat({ fromVideoPlayer, loadedSubtitles }: { fromVideoPlayer: boolean; loadedSubtitles: boolean }) {
        if (!this.installed) {
            return;
        }

        if (this.heartbeatInterval !== undefined) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = undefined;
        }

        if (fromVideoPlayer) {
            if (gt(this.version, '0.23.0')) {
                this._sendHeartbeat(true, loadedSubtitles);
                this.heartbeatInterval = setInterval(() => this._sendHeartbeat(true, loadedSubtitles), 1000);
            }
        } else {
            this._sendHeartbeat(false, loadedSubtitles);
            this.heartbeatInterval = setInterval(() => this._sendHeartbeat(false, loadedSubtitles), 1000);
        }
    }

    private _sendHeartbeat(fromVideoPlayer: boolean, loadedSubtitles: boolean) {
        const message: AsbplayerHeartbeatMessage = {
            command: 'heartbeat',
            id: id,
            receivedTabs: fromVideoPlayer ? [] : this.tabs,
            videoPlayer: fromVideoPlayer,
            sidePanel: this.sidePanel,
            loadedSubtitles,
        };
        window.postMessage({
            sender: 'asbplayerv2',
            message,
        });
    }

    openShortcuts() {
        window.postMessage({
            sender: 'asbplayerv2',
            message: {
                command: 'open-extension-shortcuts',
            },
        });
    }

    sendMessageToVideoElement(message: Message, tabId: number, src: string, callback?: (response: any) => void) {
        let command: AsbPlayerToVideoCommandV2<Message> | AsbPlayerToVideoCommandV2<MessageWithId>;

        if (callback === undefined) {
            command = {
                sender: 'asbplayerv2',
                message,
                tabId: tabId,
                src: src,
            };
            window.postMessage(command);
        } else {
            const messageId = uuidv4();
            command = {
                sender: 'asbplayerv2',
                message: { ...message, messageId },
                tabId: tabId,
                src: src,
            };
            window.postMessage(command);
            this._createResponsePromise(messageId).then(callback);
        }
    }

    notifySettingsUpdated() {
        const command: AsbPlayerCommand<SettingsUpdatedMessage> = {
            sender: 'asbplayerv2',
            message: {
                command: 'settings-updated',
            },
            asbplayerId: id,
        };
        window.postMessage(command);
    }

    toggleSidePanel() {
        const command: AsbPlayerCommand<ToggleSidePanelMessage> = {
            sender: 'asbplayerv2',
            message: {
                command: 'toggle-side-panel',
            },
        };
        window.postMessage(command);
    }

    publishCard(card: CardModel) {
        const command: AsbPlayerCommand<PublishCardMessage> = {
            sender: 'asbplayerv2',
            message: {
                command: 'publish-card',
                ...card,
            },
        };
        window.postMessage(command);
    }

    getSettings(keysAndDefaults: Partial<AsbplayerSettings>): Promise<Partial<AsbplayerSettings>> {
        const messageId = uuidv4();
        const command: AsbPlayerCommand<GetSettingsMessage> = {
            sender: 'asbplayerv2',
            message: {
                command: 'get-settings',
                keysAndDefaults,
                messageId,
            },
        };
        window.postMessage(command);
        return this._createResponsePromise(messageId);
    }

    setSettings(settings: Partial<AsbplayerSettings>): Promise<void> {
        const messageId = uuidv4();
        const command: AsbPlayerCommand<SetSettingsMessage> = {
            sender: 'asbplayerv2',
            message: {
                command: 'set-settings',
                settings,
                messageId,
            },
        };
        window.postMessage(command);
        return this._createResponsePromise(messageId).then(() => this.notifySettingsUpdated());
    }

    activeSettingsProfile(): Promise<Profile | undefined> {
        const messageId = uuidv4();
        const command: AsbPlayerCommand<GetActiveProfileMessage> = {
            sender: 'asbplayerv2',
            message: { command: 'get-active-profile', messageId },
        };
        window.postMessage(command);
        return this._createResponsePromise(messageId);
    }

    setActiveSettingsProfile(name: string | undefined): Promise<void> {
        const messageId = uuidv4();
        const command: AsbPlayerCommand<SetActiveProfileMessage> = {
            sender: 'asbplayerv2',
            message: { command: 'set-active-profile', name, messageId },
        };
        window.postMessage(command);
        return this._createResponsePromise(messageId).then(() => this.notifySettingsUpdated());
    }

    settingsProfiles(): Promise<Profile[]> {
        const messageId = uuidv4();
        const command: AsbPlayerCommand<GetProfilesMessage> = {
            sender: 'asbplayerv2',
            message: { command: 'get-profiles', messageId },
        };
        window.postMessage(command);
        return this._createResponsePromise(messageId);
    }

    addSettingsProfile(name: string): Promise<void> {
        const messageId = uuidv4();
        const command: AsbPlayerCommand<AddProfileMessage> = {
            sender: 'asbplayerv2',
            message: { command: 'add-profile', name, messageId },
        };
        window.postMessage(command);
        return this._createResponsePromise(messageId);
    }

    removeSettingsProfile(name: string): Promise<void> {
        const messageId = uuidv4();
        const command: AsbPlayerCommand<RemoveProfileMessage> = {
            sender: 'asbplayerv2',
            message: { command: 'remove-profile', name, messageId },
        };
        window.postMessage(command);
        return this._createResponsePromise(messageId);
    }

    private _createResponsePromise<T>(messageId: string) {
        return new Promise<T>((resolve, reject) => {
            this._responseResolves[messageId] = resolve;
            setTimeout(() => {
                if (messageId in this._responseResolves) {
                    delete this._responseResolves[messageId];
                    reject('Request timed out');
                }
            }, 5000);
        });
    }

    subscribeTabs(callback: (tabs: VideoTabModel[]) => void) {
        if (this.tabs !== undefined) {
            callback(this.tabs);
        }

        this.onTabsCallbacks.push(callback);
        return () => this._remove(callback, this.onTabsCallbacks);
    }

    subscribe(callback: (message: ExtensionMessage) => void) {
        this.onMessageCallbacks.push(callback);
        return () => this._remove(callback, this.onMessageCallbacks);
    }

    _remove(callback: Function, callbacks: Function[]) {
        for (let i = callbacks.length - 1; i >= 0; --i) {
            if (callback === callbacks[i]) {
                callbacks.splice(i, 1);
                break;
            }
        }
    }

    unbind() {
        window.removeEventListener('message', this.windowEventListener);
        this.onMessageCallbacks = [];
        this.onTabsCallbacks = [];
    }
}
