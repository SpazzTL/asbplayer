import { HttpFetcher } from '@project/common';
import { useCallback, useMemo } from 'react';
import { makeStyles } from '@mui/styles';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import SettingsForm from '@project/common/components/SettingsForm';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { useCommandKeyBinds } from '../hooks/use-command-key-binds';
import { useLocalFontFamilies } from '@project/common/hooks';
import { useI18n } from '../hooks/use-i18n';
import Paper from '@mui/material/Paper';
import { Anki } from '@project/common/anki';
import { useSupportedLanguages } from '../hooks/use-supported-languages';
import { isFirefoxBuild } from '../../services/build-flags';
import SettingsProfileSelectMenu from '@project/common/components/SettingsProfileSelectMenu';
import { AsbplayerSettings, Profile } from '@project/common/settings';
import { useTheme, type Theme } from '@mui/material/styles';

const useStyles = makeStyles<Theme>((theme) => ({
    root: {
        '& .MuiPaper-root': {
            height: '100vh',
        },
    },
    content: {
        maxHeight: '100%',
    },
    profilesContainer: {
        paddingLeft: theme.spacing(4),
        paddingRight: theme.spacing(4),
    },
}));

interface Props {
    settings: AsbplayerSettings;
    onSettingsChanged: (settings: Partial<AsbplayerSettings>) => void;
    profiles: Profile[];
    activeProfile?: string;
    onNewProfile: (name: string) => void;
    onRemoveProfile: (name: string) => void;
    onSetActiveProfile: (name: string | undefined) => void;
}

const SettingsPage = ({ settings, onSettingsChanged, ...profileContext }: Props) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const anki = useMemo(
        () => (settings === undefined ? undefined : new Anki(settings, new HttpFetcher())),
        [settings]
    );
    const classes = useStyles();

    const {
        updateLocalFontsPermission,
        updateLocalFonts,
        localFontsAvailable,
        localFontsPermission,
        localFontFamilies,
    } = useLocalFontFamilies();
    const handleUnlockLocalFonts = useCallback(() => {
        updateLocalFontsPermission();
        updateLocalFonts();
    }, [updateLocalFontsPermission, updateLocalFonts]);

    const commands = useCommandKeyBinds();

    const handleOpenExtensionShortcuts = useCallback(() => {
        chrome.tabs.create({ active: true, url: 'chrome://extensions/shortcuts' });
    }, []);

    const { initialized: i18nInitialized } = useI18n({ language: settings?.language ?? 'en' });
    const section = useMemo(() => {
        if (location.hash && location.hash.startsWith('#')) {
            return location.hash.substring(1, location.hash.length);
        }

        return undefined;
    }, []);
    const { supportedLanguages } = useSupportedLanguages();

    if (!settings || !anki || !commands || !i18nInitialized) {
        return null;
    }

    return (
        <Paper square style={{ height: '100vh' }}>
            <Dialog open={true} maxWidth="md" fullWidth className={classes.root} onClose={() => {}}>
                <DialogTitle>{t('settings.title')}</DialogTitle>
                <DialogContent className={classes.content}>
                    <SettingsForm
                        anki={anki}
                        extensionInstalled
                        extensionVersion={chrome.runtime.getManifest().version}
                        extensionSupportsAppIntegration
                        extensionSupportsOverlay
                        extensionSupportsSidePanel={!isFirefoxBuild}
                        extensionSupportsOrderableAnkiFields
                        extensionSupportsTrackSpecificSettings
                        extensionSupportsSubtitlesWidthSetting
                        extensionSupportsPauseOnHover
                        chromeKeyBinds={commands}
                        onOpenChromeExtensionShortcuts={handleOpenExtensionShortcuts}
                        onSettingsChanged={onSettingsChanged}
                        settings={settings}
                        localFontsAvailable={localFontsAvailable}
                        localFontsPermission={localFontsPermission}
                        localFontFamilies={localFontFamilies}
                        supportedLanguages={supportedLanguages}
                        onUnlockLocalFonts={handleUnlockLocalFonts}
                        scrollToId={section}
                    />
                </DialogContent>
                <Box style={{ marginBottom: theme.spacing(2) }} className={classes.profilesContainer}>
                    <SettingsProfileSelectMenu {...profileContext} />
                </Box>
            </Dialog>
        </Paper>
    );
};

export default SettingsPage;
