<?php
// BROWSE BIBLE flow — simple PHP model for a tag/topic, with a list of associated passages.
class Tag {
    public $id;
    public $name;

    public $passages = array();

    function addPassage($passage) {
        array_push($this->passages, $passage);
    }
}
?>
