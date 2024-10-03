import {
    ExtensionToOffscreenDocumentCommand,
    ExtensionToVideoCommand,
    RequestActiveTabPermissionMessage,
    StartRecordingAudioMessage,
    StartRecordingAudioViaCaptureStreamMessage,
    StartRecordingAudioWithTimeoutMessage,
    StartRecordingAudioWithTimeoutViaCaptureStreamMessage,
    StartRecordingResponse,
    StopRecordingAudioMessage,
    StopRecordingResponse,
} from '@project/common';

export interface Requester {
    tabId: number;
    src: string;
}

export interface AudioRecorderDelegate {
    startWithTimeout: (
        time: number,
        preferMp3: boolean,
        requestId: string,
        { tabId, src }: Requester
    ) => Promise<StartRecordingResponse>;
    start: (requestId: string, requester: Requester) => Promise<StartRecordingResponse>;
    stop: (preferMp3: boolean, requester: Requester) => Promise<StopRecordingResponse>;
}

export class OffscreenAudioRecorder implements AudioRecorderDelegate {
    private async _ensureOffscreenDocument() {
        const contexts = await chrome.runtime.getContexts({
            contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        });

        if (contexts.length === 0) {
            await chrome.offscreen.createDocument({
                url: 'offscreen-audio-recorder.html',
                reasons: [chrome.offscreen.Reason.USER_MEDIA],
                justification: 'Audio recording',
            });
        }
    }

    private _mediaStreamId(tabId: number): Promise<string> {
        return new Promise((resolve, reject) => {
            chrome.tabCapture.getMediaStreamId(
                {
                    targetTabId: tabId,
                },
                (streamId) => resolve(streamId)
            );
        });
    }

    async startWithTimeout(
        time: number,
        preferMp3: boolean,
        requestId: string,
        { tabId, src }: Requester
    ): Promise<StartRecordingResponse> {
        await this._ensureOffscreenDocument();

        const streamId = await this._mediaStreamId(tabId);
        const command: ExtensionToOffscreenDocumentCommand<StartRecordingAudioWithTimeoutMessage> = {
            sender: 'asbplayer-extension-to-offscreen-document',
            message: {
                command: 'start-recording-audio-with-timeout',
                timeout: time,
                preferMp3,
                streamId,
                requestId,
            },
        };
        return (await chrome.runtime.sendMessage(command)) as StartRecordingResponse;
    }

    async start(requestId: string, { tabId, src }: Requester) {
        await this._ensureOffscreenDocument();
        const streamId = await this._mediaStreamId(tabId);

        const command: ExtensionToOffscreenDocumentCommand<StartRecordingAudioMessage> = {
            sender: 'asbplayer-extension-to-offscreen-document',
            message: {
                command: 'start-recording-audio',
                streamId,
                requestId,
            },
        };
        return (await chrome.runtime.sendMessage(command)) as StartRecordingResponse;
    }

    async stop(preferMp3: boolean): Promise<StopRecordingResponse> {
        const command: ExtensionToOffscreenDocumentCommand<StopRecordingAudioMessage> = {
            sender: 'asbplayer-extension-to-offscreen-document',
            message: {
                command: 'stop-recording-audio',
                preferMp3,
            },
        };
        return (await chrome.runtime.sendMessage(command)) as StopRecordingResponse;
    }
}

export class CaptureStreamAudioRecorder implements AudioRecorderDelegate {
    async startWithTimeout(
        time: number,
        preferMp3: boolean,
        requestId: string,
        { tabId, src }: Requester
    ): Promise<StartRecordingResponse> {
        const command: ExtensionToVideoCommand<StartRecordingAudioWithTimeoutViaCaptureStreamMessage> = {
            sender: 'asbplayer-extension-to-video',
            message: {
                command: 'start-recording-audio-with-timeout',
                timeout: time,
                preferMp3,
                requestId,
            },
            src,
        };

        return (await chrome.tabs.sendMessage(tabId, command)) as StartRecordingResponse;
    }

    async start(requestId: string, { tabId, src }: Requester) {
        const command: ExtensionToVideoCommand<StartRecordingAudioViaCaptureStreamMessage> = {
            sender: 'asbplayer-extension-to-video',
            message: {
                command: 'start-recording-audio',
                requestId,
            },
            src,
        };
        return (await chrome.tabs.sendMessage(tabId, command)) as StartRecordingResponse;
    }

    async stop(preferMp3: boolean, { tabId, src }: Requester): Promise<StopRecordingResponse> {
        const command: ExtensionToVideoCommand<StopRecordingAudioMessage> = {
            sender: 'asbplayer-extension-to-video',
            message: {
                command: 'stop-recording-audio',
                preferMp3,
            },
            src,
        };
        return (await chrome.tabs.sendMessage(tabId, command)) as StopRecordingResponse;
    }
}
