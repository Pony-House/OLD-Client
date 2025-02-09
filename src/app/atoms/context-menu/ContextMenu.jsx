import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ContextMenu.scss';

import Tippy from '@tippyjs/react';
import 'tippy.js/animations/scale-extreme.css';

import Button from '../button/Button';
import ScrollView from '../scroll/ScrollView';
import { arrayItems as bsColorsArray } from '../../../util/styles-bootstrap';

function ContextMenu({
  content, placement, maxWidth, render, afterToggle,
}) {
  const [isVisible, setVisibility] = useState(false);
  const showMenu = () => setVisibility(true);
  const hideMenu = () => setVisibility(false);

  useEffect(() => {
    if (afterToggle !== null) afterToggle(isVisible);
  }, [isVisible]);

  return (
    <Tippy
      animation="scale-extreme"
      className="context-menu"
      visible={isVisible}
      onClickOutside={hideMenu}
      content={<ScrollView invisible>{typeof content === 'function' ? content(hideMenu) : content}</ScrollView>}
      placement={placement}
      interactive
      arrow={false}
      maxWidth={maxWidth}
      duration={200}
    >
      {render(isVisible ? hideMenu : showMenu)}
    </Tippy>
  );
}

ContextMenu.defaultProps = {
  maxWidth: 'unset',
  placement: 'right',
  afterToggle: null,
};

ContextMenu.propTypes = {
  content: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func,
  ]).isRequired,
  placement: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
  maxWidth: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  render: PropTypes.func.isRequired,
  afterToggle: PropTypes.func,
};

function MenuHeader({ children }) {
  return (
    <div className="context-menu__header">
      <div className="very-small text-gray">{children}</div>
    </div>
  );
}

MenuHeader.propTypes = {
  children: PropTypes.node.isRequired,
};

function MenuItem({
  variant, iconSrc, faSrc, type,
  onClick, children, disabled, className
}) {
  return (
    <li className="list-group-item very-small text-gray w-100 p-0">
      <Button
        className={`${className} w-100 p-2 px-4`}
        variant={variant}
        iconSrc={iconSrc}
        faSrc={faSrc}
        type={type}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </Button>
    </li>
  );
}

MenuItem.defaultProps = {
  className: null,
  variant: 'link btn-bg',
  iconSrc: null,
  faSrc: null,
  type: 'button',
  disabled: false,
  onClick: null,
};

MenuItem.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(bsColorsArray),
  iconSrc: PropTypes.string,
  faSrc: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit']),
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
};

function MenuBorder() {
  return <div style={{ borderBottom: '1px solid var(--bg-surface-border)' }}> </div>;
}

export {
  ContextMenu as default, MenuHeader, MenuItem, MenuBorder,
};
