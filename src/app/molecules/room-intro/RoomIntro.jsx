import React from 'react';
import PropTypes from 'prop-types';

import { colorMXID } from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';

function RoomIntro({
  roomId, avatarSrc, name, heading, desc, time,
}) {
  return (
    <tr className="welcome-msg">
      <td colSpan="2">
        <div className='ps-5 pt-5 pb-3'>
          <Avatar imageSrc={avatarSrc} text={name} bgColor={colorMXID(roomId)} size="large" />
          <div className="pt-4 text-bg emoji-size-fix">
            <h3>{heading}</h3>
            <div className="small">{desc}</div>
            {time !== null && <div className="mt-2 very-small text-gray">{time}</div>}
          </div>
        </div>
      </td>
    </tr>
  );
}

RoomIntro.defaultProps = {
  avatarSrc: null,
  time: null,
};

RoomIntro.propTypes = {
  roomId: PropTypes.string.isRequired,
  avatarSrc: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
  name: PropTypes.string.isRequired,
  heading: PropTypes.node.isRequired,
  desc: PropTypes.node.isRequired,
  time: PropTypes.node,
};

export default RoomIntro;
