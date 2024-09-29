# Link Analyzer for Obsidian

## 📝 Description

Link Analyzer is a powerful Obsidian plugin designed to provide a detailed analysis of links within your markdown files. It scans your notes and generates a summary table, offering insights into both outgoing and incoming links. This table can be customized and inserted directly into your notes, serving as a quick reference for your internal linking structure.

## ✨ Features

- 📊 Generates a summary table of outgoing and incoming links.
- 🛠 Customizable through various parameters.

## 🛠 Installation

1. Download the latest release from the GitHub repository.
2. Extract the `obsidian-link-analyzer` folder from the zip file into your Obsidian plugins folder.
3. Reload Obsidian.
4. Enable "Link Analyzer" in the "Community plugins" section.

## Usage

1. Open a markdown file in Obsidian.
2. Run the "Link Analyzer" command.
3. A table summarizing the links will be inserted into your note.

## 🚀 Usage

### Example 1: Using all parameters

```link-analyzer
paths: folder1, folder2, note1.md, note2.md
sort: name
col: name, outgoingCount, incomingCount, outgoing, incoming
```

### Example 2: Using minimal parameters

```link-analyzer```

## Parameters

- `paths`: Array of paths to target for link analysis.
- `sort`: Parameter to sort the table by.
- `col`: Array of columns to display in the table.


## 📌 Parameters

- `paths`: Specifies the target paths for link analysis, including individual files or entire directories.
  - **Type**: Array of strings
  - **Default**: All markdown files
  - **Example**: `paths: folder1, folder2, note1.md, note2.md`

- `sort`: Parameter to sort the table by.
  - **Type**: String  
  - **Options**: `name`, `outgoingCount`, `incomingCount`  
  - **Default**: `name`  
  - **Example**: `sort: name`

- `col`: Array of columns to display in the table.  
  - **Type**: Array of strings  
  - **Options**: `name`, `outgoingCount`, `incomingCount`, `outgoing`, `incoming`  
  - **Default**: All columns  
  - **Example**: `col: name, outgoingCount, incomingCount`