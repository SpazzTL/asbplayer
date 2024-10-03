import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { makeStyles } from '@material-ui/core/styles';
import { timeDurationDisplay } from '../services/util';
import Button from '@material-ui/core/Button';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Popover from '@material-ui/core/Popover';
import DeleteIcon from '@material-ui/icons/Delete';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import SaveAltIcon from '@material-ui/icons/SaveAlt';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import { CopyHistoryItem } from '../..';
import { AudioClip } from '../../audio-clip';
import { Image } from '../..';

interface CopyHistoryListProps {
    open: boolean;
    forceShowDownloadOptions?: boolean;
    items: CopyHistoryItem[];
    onClose: () => void;
    onDelete: (item: CopyHistoryItem) => void;
    onDeleteAll: () => void;
    onAnki: (item: CopyHistoryItem) => void;
    onSelect?: (item: CopyHistoryItem) => void;
    onClipAudio: (item: CopyHistoryItem) => void;
    onDownloadImage: (item: CopyHistoryItem) => void;
    onDownloadSectionAsSrt?: (name: string, items: CopyHistoryItem[]) => void;
}

const useStyles = makeStyles((theme) => ({
    listContainer: {
        display: 'flex',
        height: '100%',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
    },
    list: {
        flexGrow: 1,
    },
    clearButton: {
        margin: theme.spacing(2),
    },
    listItem: {
        '&:hover': {
            backgroundColor: theme.palette.action.hover,
        },
    },
    listItemGutters: {
        paddingLeft: 5,
        paddingRight: 5,
    },
    listItemIconRoot: {
        minWidth: 20,
    },
    emptyState: {
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        height: '100%',
        padding: 15,
    },
    text: {
        flexGrow: 1,
    },
    emptyText: {
        flexGrow: 1,
        color: theme.palette.text.secondary,
    },
    timestamp: {
        paddingRight: 15,
        paddingLeft: 15,
        color: theme.palette.text.secondary,
    },
}));

const useAudioAvailability = (item: CopyHistoryItem) => {
    const [isAudioAvailable, setIsAudioAvailable] = useState<boolean>();

    useEffect(() => {
        const clip = AudioClip.fromCard(item, 0, 0);

        if (clip) {
            setIsAudioAvailable(clip.error === undefined);
        } else {
            setIsAudioAvailable(false);
        }
    }, [item]);

    return { isAudioAvailable };
};

const useImageAvailability = (item: CopyHistoryItem) => {
    const [isImageAvailable, setIsImageAvailable] = useState<boolean>();

    useEffect(() => {
        const image = Image.fromCard(item, 0, 0);

        if (image) {
            setIsImageAvailable(image.error === undefined);
        } else {
            setIsImageAvailable(false);
        }
    }, [item]);

    return { isImageAvailable };
};

interface MenuProps {
    open: boolean;
    item: CopyHistoryItem;
    anchorEl?: Element;
    forceShowDownloadOptions?: boolean;
    onClose: () => void;
    onSelect?: (item: CopyHistoryItem) => void;
    onClipAudio: (item: CopyHistoryItem) => void;
    onDownloadImage: (item: CopyHistoryItem) => void;
    onDelete: (item: CopyHistoryItem) => void;
}

function Menu({
    open,
    anchorEl,
    forceShowDownloadOptions,
    onClose,
    onSelect,
    onClipAudio,
    onDownloadImage,
    onDelete,
    item,
}: MenuProps) {
    const { t } = useTranslation();
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(item!.subtitle.text);
        onClose();
    }, [item, onClose]);

    const handleJumpTo = useCallback(() => {
        if (onSelect === undefined) {
            return;
        }

        onSelect(item!);
        onClose();
    }, [item, onSelect, onClose]);

    const handleClipAudio = useCallback(() => {
        onClipAudio(item!);
        onClose();
    }, [item, onClipAudio, onClose]);

    const handleDownloadImage = useCallback(() => {
        onDownloadImage(item!);
        onClose();
    }, [item, onDownloadImage, onClose]);

    const handleDelete = useCallback(() => {
        onDelete(item!);
        onClose();
    }, [item, onDelete, onClose]);

    const { isImageAvailable } = useImageAvailability(item);
    const { isAudioAvailable } = useAudioAvailability(item);

    return (
        <Popover
            disableEnforceFocus={true}
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'center',
                horizontal: 'center',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
        >
            <List>
                <ListItem button onClick={handleCopy}>
                    <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={t('action.copy')} />
                </ListItem>
                {onSelect && (
                    <ListItem button onClick={handleJumpTo}>
                        <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={t('action.jumpTo')} />
                    </ListItem>
                )}
                {(isAudioAvailable || forceShowDownloadOptions) && (
                    <ListItem button onClick={handleClipAudio}>
                        <ListItemText
                            primaryTypographyProps={{ variant: 'body2' }}
                            primary={t('action.downloadAudio')}
                        />
                    </ListItem>
                )}
                {(isImageAvailable || forceShowDownloadOptions) && (
                    <ListItem button onClick={handleDownloadImage}>
                        <ListItemText
                            primaryTypographyProps={{ variant: 'body2' }}
                            primary={t('action.downloadImage')}
                        />
                    </ListItem>
                )}
                <ListItem button onClick={handleDelete}>
                    <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={t('action.delete')} />
                </ListItem>
            </List>
        </Popover>
    );
}

export default function CopyHistoryList({
    open,
    items,
    forceShowDownloadOptions,
    onSelect,
    onClipAudio,
    onDownloadImage,
    onDelete,
    onDeleteAll,
    onDownloadSectionAsSrt,
    onAnki,
}: CopyHistoryListProps) {
    const classes = useStyles();
    const scrollToBottomRefCallback = useCallback((element: HTMLElement | null) => {
        if (element) {
            element.scrollIntoView();
        }
    }, []);
    const [menuItem, setMenuItem] = useState<CopyHistoryItem>();
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<Element>();
    const { t } = useTranslation();

    const handleMenu = useCallback((e: React.MouseEvent, item: CopyHistoryItem) => {
        setMenuItem(item);
        setMenuOpen(true);
        setMenuAnchorEl(e.currentTarget);
    }, []);

    const handleMenuClosed = useCallback(() => {
        setMenuItem(undefined);
        setMenuOpen(false);
        setMenuAnchorEl(undefined);
    }, []);

    const handleDelete = useCallback(
        (item: CopyHistoryItem) => {
            onDelete(item);
        },
        [onDelete]
    );

    let content;

    if (items.length > 0) {
        const elements: JSX.Element[] = [];
        let lastSeenItemName: string | null = null;
        let i = 0;
        const itemNameCounters: { [name: string]: number } = {};
        let itemsBySection: { [key: string]: CopyHistoryItem[] } = {};
        let currentKey: string | undefined;

        for (const item of items) {
            if (lastSeenItemName === null || lastSeenItemName !== item.subtitleFileName) {
                if (item.subtitleFileName in itemNameCounters) {
                    itemNameCounters[item.subtitleFileName]++;
                } else {
                    itemNameCounters[item.subtitleFileName] = 0;
                }

                const key = item.subtitleFileName + '-' + itemNameCounters[item.subtitleFileName];
                itemsBySection[key] = [];
                lastSeenItemName = item.subtitleFileName;
                currentKey = key;

                elements.push(
                    <ListItem key={key}>
                        <Typography color="textSecondary">{item.subtitleFileName}</Typography>
                        {onDownloadSectionAsSrt && (
                            <ListItemSecondaryAction>
                                <Tooltip title={t('copyHistory.downloadMinedSubsAsSrt')!}>
                                    <IconButton
                                        onClick={() =>
                                            onDownloadSectionAsSrt?.(item.subtitleFileName, itemsBySection[key])
                                        }
                                        edge="end"
                                    >
                                        <SaveAltIcon />
                                    </IconButton>
                                </Tooltip>
                            </ListItemSecondaryAction>
                        )}
                    </ListItem>
                );
            }

            itemsBySection[currentKey!].push(item);
            const ref = i === items.length - 1 ? scrollToBottomRefCallback : null;

            elements.push(
                <ListItem
                    ref={ref}
                    key={item.id}
                    className={classes.listItem}
                    classes={{ gutters: classes.listItemGutters }}
                >
                    <ListItemIcon classes={{ root: classes.listItemIconRoot }}>
                        <Tooltip title={t('copyHistory.exportToAnki')!}>
                            <IconButton onClick={() => onAnki(item)}>
                                <NoteAddIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </ListItemIcon>
                    <ListItemIcon classes={{ root: classes.listItemIconRoot }}>
                        <IconButton onClick={(e) => handleMenu(e, item)}>
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <Grid wrap="nowrap" container>
                                <Grid item className={item.subtitle.text === '' ? classes.emptyText : classes.text}>
                                    {item.subtitle.text === '' ? t('copyHistory.blank') : item.subtitle.text}
                                </Grid>
                                <Grid item className={classes.timestamp}>
                                    {timeDurationDisplay(item.subtitle.start, item.subtitle.start, false)}
                                </Grid>
                            </Grid>
                        }
                    />
                </ListItem>
            );

            ++i;
        }

        content = (
            <div className={classes.listContainer}>
                <List className={classes.list}>{elements}</List>
                <Button
                    variant="contained"
                    color="secondary"
                    className={classes.clearButton}
                    startIcon={<DeleteIcon />}
                    onClick={onDeleteAll}
                >
                    {t('copyHistory.deleteAll')}
                </Button>
            </div>
        );
    } else {
        content = (
            <div className={classes.emptyState}>
                <Typography variant="h6">{t('copyHistory.miningHistoryEmpty')}</Typography>
            </div>
        );
    }

    return (
        <>
            {content}
            {menuItem && (
                <Menu
                    open={open && menuOpen}
                    forceShowDownloadOptions={forceShowDownloadOptions}
                    anchorEl={menuAnchorEl}
                    item={menuItem}
                    onClose={handleMenuClosed}
                    onSelect={onSelect}
                    onClipAudio={onClipAudio}
                    onDownloadImage={onDownloadImage}
                    onDelete={handleDelete}
                />
            )}
        </>
    );
}
