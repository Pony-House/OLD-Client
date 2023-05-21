/* eslint-disable react/prop-types */
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { openReusableContextMenu } from '../../../client/action/navigation';
import { getEventCords, abbreviateNumber } from '../../../util/common';
import { joinRuleToIconSrc } from '../../../util/matrixUtil';

import IconButton from '../../atoms/button/IconButton';
import RoomSelector from '../../molecules/room-selector/RoomSelector';
import RoomOptions from '../../molecules/room-options/RoomOptions';
import SpaceOptions from '../../molecules/space-options/SpaceOptions';

import { useForceUpdate } from '../../hooks/useForceUpdate';

// Selector Function
function Selector({
  roomId, isDM, drawerPostie, onClick, roomObject
}) {

  // Base Script
  const mx = initMatrix.matrixClient;
  const noti = initMatrix.notifications;

  // Room Data
  let room;

  if (!roomObject) {
    room = mx.getRoom(roomId);
  } else {
    room = roomObject;
  }

  // Is Room
  if (!isDM) {

    // Separe Channel Name
    const name = room.name.split(' - ');
    if (name.length > 0) {

      // Index Channel
      const index = Number(name[0]);
      if (typeof index === 'number' && !Number.isNaN(index)) {

        name.shift();
        room.nameCinny = { original: room.name, index };
        room.name = name.join(' - ');

      }

    }

  }

  // Image
  let imageSrc = room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;
  if (imageSrc === null) imageSrc = room.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;

  // Is Muted
  const isMuted = noti.getNotiType(roomId) === cons.notifs.MUTE;

  // Force Update
  const [, forceUpdate] = useForceUpdate();

  // Effects
  useEffect(() => {
    const unSub1 = drawerPostie.subscribe('selector-change', roomId, forceUpdate);
    const unSub2 = drawerPostie.subscribe('unread-change', roomId, forceUpdate);
    return () => {
      unSub1();
      unSub2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Options
  const openOptions = (e) => {

    e.preventDefault();
    openReusableContextMenu(

      'right',

      getEventCords(e, '.room-selector'),
      room.isSpaceRoom()
        ? (closeMenu) => <SpaceOptions roomId={roomId} afterOptionSelect={closeMenu} />
        : (closeMenu) => <RoomOptions roomId={roomId} afterOptionSelect={closeMenu} />,

    );

  };

  // Complete Data
  return (
    <RoomSelector
      key={roomId}
      name={room.name}
      roomId={roomId}
      imageSrc={isDM ? imageSrc : null}
      iconSrc={isDM ? null : joinRuleToIconSrc(room.getJoinRule(), room.isSpaceRoom())}
      isSelected={navigation.selectedRoomId === roomId}
      isMuted={isMuted}
      isUnread={!isMuted && noti.hasNoti(roomId)}
      notificationCount={abbreviateNumber(noti.getTotalNoti(roomId))}
      isAlert={noti.getHighlightNoti(roomId) !== 0}
      onClick={onClick}
      onContextMenu={openOptions}
      options={(
        <IconButton
          size="extra-small"
          tooltip="Options"
          tooltipPlacement="right"
          fa="bi bi-three-dots-vertical"
          onClick={openOptions}
        />
      )}
    />
  );

}

// Default
Selector.defaultProps = {
  isDM: true,
};

Selector.propTypes = {

  roomId: PropTypes.string.isRequired,
  isDM: PropTypes.bool,

  // eslint-disable-next-line react/forbid-prop-types
  roomObject: PropTypes.object,

  drawerPostie: PropTypes.shape({}).isRequired,
  onClick: PropTypes.func.isRequired,

};

export default Selector;
