/* eslint-disable react/prop-types */
import React, { useState, useEffect, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import './ChannelViewContent.scss';

import dateFormat from 'dateformat';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { redactEvent, sendReaction } from '../../../client/action/roomTimeline';
import { getUsername, doesRoomHaveUnread } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';
import { diffMinutes, isNotInSameDay } from '../../../util/common';
import { openEmojiBoard } from '../../../client/action/navigation';

import Divider from '../../atoms/divider/Divider';
import Avatar from '../../atoms/avatar/Avatar';
import IconButton from '../../atoms/button/IconButton';
import {
  Message,
  MessageHeader,
  MessageReply,
  MessageContent,
  MessageReactionGroup,
  MessageReaction,
  MessageOptions,
  PlaceholderMessage,
} from '../../molecules/message/Message';
import * as Media from '../../molecules/media/Media';
import ChannelIntro from '../../molecules/channel-intro/ChannelIntro';
import TimelineChange from '../../molecules/message/TimelineChange';

import ReplyArrowIC from '../../../../public/res/ic/outlined/reply-arrow.svg';
import EmojiAddIC from '../../../../public/res/ic/outlined/emoji-add.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';

import { parseReply, parseTimelineChange } from './common';

const MAX_MSG_DIFF_MINUTES = 5;

function genPlaceholders() {
  return (
    <>
      <PlaceholderMessage key={Math.random().toString(20).substr(2, 6)} />
      <PlaceholderMessage key={Math.random().toString(20).substr(2, 6)} />
      <PlaceholderMessage key={Math.random().toString(20).substr(2, 6)} />
    </>
  );
}

function isMedia(mE) {
  return (
    mE.getContent()?.msgtype === 'm.file'
    || mE.getContent()?.msgtype === 'm.image'
    || mE.getContent()?.msgtype === 'm.audio'
    || mE.getContent()?.msgtype === 'm.video'
  );
}

function genMediaContent(mE) {
  const mx = initMatrix.matrixClient;
  const mContent = mE.getContent();
  let mediaMXC = mContent.url;
  let thumbnailMXC = mContent?.info?.thumbnail_url;
  const isEncryptedFile = typeof mediaMXC === 'undefined';
  if (isEncryptedFile) mediaMXC = mContent.file.url;

  switch (mE.getContent()?.msgtype) {
    case 'm.file':
      return (
        <Media.File
          name={mContent.body}
          link={mx.mxcUrlToHttp(mediaMXC)}
          file={mContent.file}
          type={mContent.info.mimetype}
        />
      );
    case 'm.image':
      return (
        <Media.Image
          name={mContent.body}
          width={mContent.info.w || null}
          height={mContent.info.h || null}
          link={mx.mxcUrlToHttp(mediaMXC)}
          file={isEncryptedFile ? mContent.file : null}
          type={mContent.info.mimetype}
        />
      );
    case 'm.audio':
      return (
        <Media.Audio
          name={mContent.body}
          link={mx.mxcUrlToHttp(mediaMXC)}
          type={mContent.info.mimetype}
          file={mContent.file}
        />
      );
    case 'm.video':
      if (typeof thumbnailMXC === 'undefined') {
        thumbnailMXC = mContent.info?.thumbnail_file?.url || null;
      }
      return (
        <Media.Video
          name={mContent.body}
          link={mx.mxcUrlToHttp(mediaMXC)}
          thumbnail={thumbnailMXC === null ? null : mx.mxcUrlToHttp(thumbnailMXC)}
          thumbnailFile={isEncryptedFile ? mContent.info.thumbnail_file : null}
          thumbnailType={mContent.info.thumbnail_info?.mimetype || null}
          width={mContent.info.w || null}
          height={mContent.info.h || null}
          file={isEncryptedFile ? mContent.file : null}
          type={mContent.info.mimetype}
        />
      );
    default:
      return 'Unable to attach media file!';
  }
}

function genChannelIntro(mEvent, roomTimeline) {
  const roomTopic = roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;
  return (
    <ChannelIntro
      key={mEvent ? mEvent.getId() : Math.random().toString(20).substr(2, 6)}
      avatarSrc={roomTimeline.room.getAvatarUrl(initMatrix.matrixClient.baseUrl, 80, 80, 'crop')}
      name={roomTimeline.room.name}
      heading={`Welcome to ${roomTimeline.room.name}`}
      desc={`This is the beginning of ${roomTimeline.room.name} channel.${typeof roomTopic !== 'undefined' ? (` Topic: ${roomTopic}`) : ''}`}
      time={mEvent ? `Created at ${dateFormat(mEvent.getDate(), 'dd mmmm yyyy, hh:MM TT')}` : null}
    />
  );
}

function getMyEmojiEventId(emojiKey, eventId, roomTimeline) {
  const mx = initMatrix.matrixClient;
  const rEvents = roomTimeline.reactionTimeline.get(eventId);
  let rEventId = null;
  rEvents?.find((rE) => {
    if (rE.getRelation() === null) return false;
    if (rE.getRelation().key === emojiKey && rE.getSender() === mx.getUserId()) {
      rEventId = rE.getId();
      return true;
    }
    return false;
  });
  return rEventId;
}

function toggleEmoji(roomId, eventId, emojiKey, roomTimeline) {
  const myAlreadyReactEventId = getMyEmojiEventId(emojiKey, eventId, roomTimeline);
  if (typeof myAlreadyReactEventId === 'string') {
    if (myAlreadyReactEventId.indexOf('~') === 0) return;
    redactEvent(roomId, myAlreadyReactEventId);
    return;
  }
  sendReaction(roomId, eventId, emojiKey);
}

function pickEmoji(e, roomId, eventId, roomTimeline) {
  openEmojiBoard({
    x: e.detail ? e.clientX : '50%',
    y: e.detail ? e.clientY : '50%',
    detail: e.detail,
  }, (emoji) => {
    toggleEmoji(roomId, eventId, emoji.unicode, roomTimeline);
    e.target.click();
  });
}

function genMessage(roomId, prevMEvent, mEvent, roomTimeline, viewEvent) {
  const mx = initMatrix.matrixClient;
  const myPowerlevel = roomTimeline.room.getMember(mx.getUserId()).powerLevel;
  const canIRedact = roomTimeline.room.currentState.hasSufficientPowerLevelFor('redact', myPowerlevel);

  const isContentOnly = (
    prevMEvent !== null
    && prevMEvent.getType() !== 'm.room.member'
    && diffMinutes(mEvent.getDate(), prevMEvent.getDate()) <= MAX_MSG_DIFF_MINUTES
    && prevMEvent.getSender() === mEvent.getSender()
  );

  let content = mEvent.getContent().body;
  if (typeof content === 'undefined') return null;
  let reply = null;
  let reactions = null;
  let isMarkdown = mEvent.getContent().format === 'org.matrix.custom.html';
  const isReply = typeof mEvent.getWireContent()['m.relates_to']?.['m.in_reply_to'] !== 'undefined';
  const isEdited = roomTimeline.editedTimeline.has(mEvent.getId());
  const haveReactions = roomTimeline.reactionTimeline.has(mEvent.getId());

  if (isReply) {
    const parsedContent = parseReply(content);

    if (parsedContent !== null) {
      const username = getUsername(parsedContent.userId);
      reply = {
        userId: parsedContent.userId,
        color: colorMXID(parsedContent.userId),
        to: username,
        content: parsedContent.replyContent,
      };
      content = parsedContent.content;
    }
  }

  if (isEdited) {
    const editedList = roomTimeline.editedTimeline.get(mEvent.getId());
    const latestEdited = editedList[editedList.length - 1];
    if (typeof latestEdited.getContent()['m.new_content'] === 'undefined') return null;
    const latestEditBody = latestEdited.getContent()['m.new_content'].body;
    const parsedEditedContent = parseReply(latestEditBody);
    isMarkdown = latestEdited.getContent()['m.new_content'].format === 'org.matrix.custom.html';
    if (parsedEditedContent === null) {
      content = latestEditBody;
    } else {
      content = parsedEditedContent.content;
    }
  }

  if (haveReactions) {
    reactions = [];
    roomTimeline.reactionTimeline.get(mEvent.getId()).forEach((rEvent) => {
      if (rEvent.getRelation() === null) return;
      function alreadyHaveThisReaction(rE) {
        for (let i = 0; i < reactions.length; i += 1) {
          if (reactions[i].key === rE.getRelation().key) return true;
        }
        return false;
      }
      if (alreadyHaveThisReaction(rEvent)) {
        for (let i = 0; i < reactions.length; i += 1) {
          if (reactions[i].key === rEvent.getRelation().key) {
            reactions[i].users.push(rEvent.getSender());
            if (reactions[i].isActive !== true) {
              const myUserId = initMatrix.matrixClient.getUserId();
              reactions[i].isActive = rEvent.getSender() === myUserId;
              if (reactions[i].isActive) reactions[i].id = rEvent.getId();
            }
            break;
          }
        }
      } else {
        reactions.push({
          id: rEvent.getId(),
          key: rEvent.getRelation().key,
          users: [rEvent.getSender()],
          isActive: (rEvent.getSender() === initMatrix.matrixClient.getUserId()),
        });
      }
    });
  }

  const senderMXIDColor = colorMXID(mEvent.sender.userId);
  const userAvatar = isContentOnly ? null : (
    <Avatar
      imageSrc={mEvent.sender.getAvatarUrl(initMatrix.matrixClient.baseUrl, 36, 36, 'crop')}
      text={getUsername(mEvent.sender.userId).slice(0, 1)}
      bgColor={senderMXIDColor}
      size="small"
    />
  );
  const userHeader = isContentOnly ? null : (
    <MessageHeader
      userId={mEvent.sender.userId}
      name={getUsername(mEvent.sender.userId)}
      color={senderMXIDColor}
      time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
    />
  );
  const userReply = reply === null ? null : (
    <MessageReply
      userId={reply.userId}
      name={reply.to}
      color={reply.color}
      content={reply.content}
    />
  );
  const userContent = (
    <MessageContent
      isMarkdown={isMarkdown}
      content={isMedia(mEvent) ? genMediaContent(mEvent) : content}
      isEdited={isEdited}
    />
  );
  const userReactions = reactions === null ? null : (
    <MessageReactionGroup>
      {
        reactions.map((reaction) => (
          <MessageReaction
            key={reaction.id}
            reaction={reaction.key}
            users={reaction.users}
            isActive={reaction.isActive}
            onClick={() => {
              toggleEmoji(roomId, mEvent.getId(), reaction.key, roomTimeline);
            }}
          />
        ))
      }
      <IconButton
        onClick={(e) => pickEmoji(e, roomId, mEvent.getId(), roomTimeline)}
        src={EmojiAddIC}
        size="extra-small"
        tooltip="Add reaction"
      />
    </MessageReactionGroup>
  );
  const userOptions = (
    <MessageOptions>
      <IconButton
        onClick={(e) => pickEmoji(e, roomId, mEvent.getId(), roomTimeline)}
        src={EmojiAddIC}
        size="extra-small"
        tooltip="Add reaction"
      />
      <IconButton
        onClick={() => {
          viewEvent.emit('reply_to', mEvent.getSender(), mEvent.getId(), isMedia(mEvent) ? mEvent.getContent().body : content);
        }}
        src={ReplyArrowIC}
        size="extra-small"
        tooltip="Reply"
      />
      {(canIRedact || mEvent.getSender() === mx.getUserId()) && (
        <IconButton
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this event')) {
              redactEvent(roomId, mEvent.getId());
            }
          }}
          src={BinIC}
          size="extra-small"
          tooltip="Delete"
        />
      )}
    </MessageOptions>
  );

  const myMessageEl = (
    <Message
      key={mEvent.getId()}
      avatar={userAvatar}
      header={userHeader}
      reply={userReply}
      content={userContent}
      reactions={userReactions}
      options={userOptions}
    />
  );
  return myMessageEl;
}

let wasAtBottom = true;
function ChannelViewContent({
  roomId, roomTimeline, timelineScroll, viewEvent,
}) {
  const [isReachedTimelineEnd, setIsReachedTimelineEnd] = useState(false);
  const [onStateUpdate, updateState] = useState(null);
  const [onPagination, setOnPagination] = useState(null);
  const mx = initMatrix.matrixClient;

  function autoLoadTimeline() {
    if (timelineScroll.isScrollable() === true) return;
    roomTimeline.paginateBack();
  }
  function trySendingReadReceipt() {
    const { room, timeline } = roomTimeline;
    if (doesRoomHaveUnread(room) && timeline.length !== 0) {
      mx.sendReadReceipt(timeline[timeline.length - 1]);
    }
  }

  function onReachedTop() {
    if (roomTimeline.isOngoingPagination || isReachedTimelineEnd) return;
    roomTimeline.paginateBack();
  }
  function toggleOnReachedBottom(isBottom) {
    wasAtBottom = isBottom;
    if (!isBottom) return;
    trySendingReadReceipt();
  }

  const updatePAG = (canPagMore) => {
    if (!canPagMore) {
      setIsReachedTimelineEnd(true);
    } else {
      setOnPagination({});
      autoLoadTimeline();
    }
  };
  // force update RoomTimeline on cons.events.roomTimeline.EVENT
  const updateRT = () => {
    if (wasAtBottom) {
      trySendingReadReceipt();
    }
    updateState({});
  };

  useEffect(() => {
    setIsReachedTimelineEnd(false);
    wasAtBottom = true;
  }, [roomId]);
  useEffect(() => trySendingReadReceipt(), [roomTimeline]);

  // init room setup completed.
  // listen for future. setup stateUpdate listener.
  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.EVENT, updateRT);
    roomTimeline.on(cons.events.roomTimeline.PAGINATED, updatePAG);
    viewEvent.on('reached-top', onReachedTop);
    viewEvent.on('toggle-reached-bottom', toggleOnReachedBottom);

    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.EVENT, updateRT);
      roomTimeline.removeListener(cons.events.roomTimeline.PAGINATED, updatePAG);
      viewEvent.removeListener('reached-top', onReachedTop);
      viewEvent.removeListener('toggle-reached-bottom', toggleOnReachedBottom);
    };
  }, [roomTimeline, isReachedTimelineEnd, onPagination]);

  useLayoutEffect(() => {
    timelineScroll.reachBottom();
    autoLoadTimeline();
  }, [roomTimeline]);

  useLayoutEffect(() => {
    if (onPagination === null) return;
    timelineScroll.tryRestoringScroll();
  }, [onPagination]);

  useEffect(() => {
    if (onStateUpdate === null) return;
    if (wasAtBottom) timelineScroll.reachBottom();
  }, [onStateUpdate]);

  let prevMEvent = null;
  function renderMessage(mEvent) {
    if (mEvent.getType() === 'm.room.create') return genChannelIntro(mEvent, roomTimeline);
    if (
      mEvent.getType() !== 'm.room.message'
      && mEvent.getType() !== 'm.room.encrypted'
      && mEvent.getType() !== 'm.room.member'
    ) return false;
    if (mEvent.getRelation()?.rel_type === 'm.replace') return false;

    // ignore if message is deleted
    if (mEvent.isRedacted()) return false;

    let divider = null;
    if (prevMEvent !== null && isNotInSameDay(mEvent.getDate(), prevMEvent.getDate())) {
      divider = <Divider key={`divider-${mEvent.getId()}`} text={`${dateFormat(mEvent.getDate(), 'mmmm dd, yyyy')}`} />;
    }

    if (mEvent.getType() !== 'm.room.member') {
      const messageComp = genMessage(roomId, prevMEvent, mEvent, roomTimeline, viewEvent);
      prevMEvent = mEvent;
      return (
        <React.Fragment key={`box-${mEvent.getId()}`}>
          {divider}
          {messageComp}
        </React.Fragment>
      );
    }

    prevMEvent = mEvent;
    const timelineChange = parseTimelineChange(mEvent);
    if (timelineChange === null) return null;
    return (
      <React.Fragment key={`box-${mEvent.getId()}`}>
        {divider}
        <TimelineChange
          key={mEvent.getId()}
          variant={timelineChange.variant}
          content={timelineChange.content}
          time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
        />
      </React.Fragment>
    );
  }

  return (
    <div className="channel-view__content">
      <div className="timeline__wrapper">
        { roomTimeline.timeline[0].getType() !== 'm.room.create' && !isReachedTimelineEnd && genPlaceholders() }
        { roomTimeline.timeline[0].getType() !== 'm.room.create' && isReachedTimelineEnd && genChannelIntro(undefined, roomTimeline)}
        { roomTimeline.timeline.map(renderMessage) }
      </div>
    </div>
  );
}
ChannelViewContent.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  timelineScroll: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default ChannelViewContent;