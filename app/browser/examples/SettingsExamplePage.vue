<script lang="ts" setup>
import ExamplesShell from './ExamplesShell.vue'
import SettingsExample from './SettingsExample.vue'
import source from './SettingsExample.vue?raw'
</script>

<template>
	<ExamplesShell id="example-settings" title="Settings" :source="source">
		<SettingsExample />
	</ExamplesShell>
</template>
